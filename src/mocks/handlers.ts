import { http, HttpResponse } from 'msw';
import type { components } from '../api/generated/openapi';
import { API_BASE_URL } from '../api/client';
import { loginSchema, profileSchema, registerSchema } from '../features/auth/validation';
import { recipeSchema } from '../features/recipes/validation';
import { articleSchema, normalizeArticleDraft } from '../features/articles/validation';
import { commentSchema, reviewSchema } from '../features/community/validation';
import { articles, categories, comments, recipes, reviews, type ArticleRecord, type CommentRecord, type RecipeDetail, type ReviewRecord } from './fixtures';

type User = components['schemas']['User'];
type AuthResponse = components['schemas']['AuthResponse'];
type RecipeRequest = components['schemas']['RecipeRequest'];
type ErrorResponse = components['schemas']['ErrorResponse'];

const users = new Map<string, { user: User; password: string }>();
const refreshTokens = new Map<string, User>();
const favorites = new Map<number, Set<number>>();
let nextRecipeId = 11;
let nextArticleId = 6;
let nextCommentId = 5;
let nextReviewId = 6;
const images = new Map<string, Blob>();
let nextTokenId = 1;
let tokenExpiredInjected = false;
let tokenExpiredRefreshUser: User | null = null;

const admin: User = { id: 1, name: 'Admin DapurKita', email: 'admin@dapurkita.local', role: 'ADMIN' };
const adminPassword = 'Admin12345!';
const tokenUsers = new Map<string, User>();

function apiPath(path: string) { return `${API_BASE_URL}${path}`; }
function requestPath(request: Request) { return new URL(request.url).pathname; }
function encodeUser(user: User) {
  const bytes = new TextEncoder().encode(JSON.stringify(user));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function decodeUser(token: string): User | null {
  if (!token.startsWith('mock-refresh-')) return null;
  try {
    const encoded = token.slice('mock-refresh-'.length).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes)) as User;
    return value && typeof value.id === 'number' && (value.role === 'USER' || value.role === 'ADMIN') ? value : null;
  } catch { return null; }
}

function error(status: number, code: ErrorResponse['code'], message: string, path: string, errors?: ErrorResponse['errors']) {
  const body: ErrorResponse = {
    status, code, message, path, timestamp: new Date().toISOString(),
    ...(errors ? { errors } : {}),
  };
  return HttpResponse.json(body, { status });
}

function invalid(errorValue: { issues: { path: PropertyKey[]; message: string }[] }, path: string) {
  return error(400, 'VALIDATION_ERROR', 'Data tidak valid', path,
    errorValue.issues.map((issue) => ({
      field: issue.path.reduce<string>((field, part) => {
        const segment = String(part);
        return /^\d+$/.test(segment) ? `${field}[${segment}]` : field ? `${field}.${segment}` : segment;
      }, ''),
      message: issue.message,
    })));
}

function userFor(request: Request) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return bearer ? tokenUsers.get(bearer) ?? null : null;
}

function maybeTokenExpired(request: Request, path: string) {
  if (import.meta.env.VITE_MOCK_TOKEN_EXPIRED_ONCE !== 'true' || tokenExpiredInjected || !userFor(request)) return null;
  tokenExpiredInjected = true;
  tokenExpiredRefreshUser = userFor(request);
  return error(401, 'TOKEN_EXPIRED', 'Token kedaluwarsa', path);
}

function invalidCategoryId(path: string) {
  return error(400, 'VALIDATION_ERROR', 'Data tidak valid', path,
    [{ field: 'categoryId', message: 'Kategori tidak ditemukan' }]);
}

function requireUser(request: Request, path: string) {
  const expired = maybeTokenExpired(request, path);
  if (expired) return { response: expired };
  const user = userFor(request);
  return user ? { user } : { response: error(401, 'UNAUTHORIZED', 'Autentikasi diperlukan', path) };
}

function requireAdmin(request: Request, path: string) {
  const expired = maybeTokenExpired(request, path);
  if (expired) return { response: expired };
  const user = userFor(request);
  if (!user) return { response: error(401, 'UNAUTHORIZED', 'Autentikasi diperlukan', path) };
  if (user.role !== 'ADMIN') return { response: error(403, 'FORBIDDEN', 'Akses ditolak', path) };
  return { user };
}

function authResponse(user: User) {
  const accessToken = `mock-access-${nextTokenId++}`;
  const refreshToken = `mock-refresh-${encodeUser(user)}`;
  tokenUsers.set(accessToken, user);
  refreshTokens.set(refreshToken, user);
  const body: AuthResponse = { accessToken, tokenType: 'Bearer', expiresIn: 900, user };
  return HttpResponse.json(body, {
    headers: { 'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800` },
  });
}

function recipeSummary(recipe: RecipeDetail, user: User | null) {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    cookingTimeMinutes: recipe.cookingTimeMinutes,
    servings: recipe.servings,
    category: recipe.category,
    isFavorited: user ? (favorites.get(user.id)?.has(recipe.id) ?? false) : false,
    ...ratingOf(recipe.id),
    createdAt: recipe.createdAt,
  };
}

function ratingOf(recipeId: number) {
  const items = reviews.filter((review) => review.recipeId === recipeId);
  if (!items.length) return { ratingAverage: null, ratingCount: 0 };
  const average = items.reduce((sum, review) => sum + review.rating, 0) / items.length;
  return { ratingAverage: Math.round(average * 10) / 10, ratingCount: items.length };
}

function pageSlice<T>(items: T[], page: number, size: number) {
  const start = (page - 1) * size;
  return { content: items.slice(start, start + size), page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size), hasNext: start + size < items.length };
}

function publicReview({ recipeId: _recipeId, ...review }: ReviewRecord) { return review; }

function commentTree(comment: CommentRecord) {
  const replies = comments.filter((item) => item.parentId === comment.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((reply) => ({ ...reply, replies: [] }));
  return { ...comment, replies };
}

function readingTime(content: string) { return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200)); }
function articleSummary({ content, updatedAt: _updatedAt, ...article }: ArticleRecord) {
  return { ...article, readingTimeMinutes: readingTime(content) };
}
function articlesByDate() { return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)); }
function articleDetail(article: ArticleRecord) {
  const ordered = articlesByDate();
  const index = ordered.findIndex((item) => item.id === article.id);
  const link = (item?: ArticleRecord) => item ? { id: item.id, title: item.title, coverImageUrl: item.coverImageUrl } : null;
  return { ...articleSummary(article), content: article.content, updatedAt: article.updatedAt, previous: link(ordered[index + 1]), next: link(ordered[index - 1]) };
}
function recipeExists(id: number) { return recipes.some((recipe) => recipe.id === id); }

function recipeDetail(recipe: RecipeDetail, user: User | null) {
  return { ...recipeSummary(recipe, user), ingredients: recipe.ingredients, instructions: recipe.instructions, updatedAt: recipe.updatedAt };
}

function parsePageParams(request: Request, path: string) {
  const url = new URL(request.url);
  const values = [
    { name: 'page', raw: url.searchParams.get('page'), fallback: 1, min: 1, max: Number.MAX_SAFE_INTEGER },
    { name: 'size', raw: url.searchParams.get('size'), fallback: 12, min: 1, max: 50 },
  ];
  const errors: NonNullable<ErrorResponse['errors']> = [];
  const parsed = new Map<string, number>();
  for (const value of values) {
    const number = value.raw === null ? value.fallback : Number(value.raw);
    if (!Number.isInteger(number) || number < value.min || number > value.max) {
      errors.push({ field: value.name, message: value.name === 'size' ? 'Ukuran halaman harus 1 sampai 50' : 'Halaman harus bilangan bulat minimal 1' });
    } else parsed.set(value.name, number);
  }
  const sort = url.searchParams.get('sort') ?? 'newest';
  if (!['newest', 'oldest', 'title'].includes(sort)) errors.push({ field: 'sort', message: 'Urutan tidak dikenal' });
  if (errors.length) return { response: error(400, 'VALIDATION_ERROR', 'Data tidak valid', path, errors) };
  return { page: parsed.get('page')!, size: parsed.get('size')!, sort: sort as 'newest' | 'oldest' | 'title' };
}

function sortRecipes(items: RecipeDetail[], sort: 'newest' | 'oldest' | 'title') {
  return [...items].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) :
    sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
}

function pageOf(items: RecipeDetail[], page: number, size: number, user: User | null) {
  const start = (page - 1) * size;
  const content = items.slice(start, start + size).map((recipe) => recipeSummary(recipe, user));
  return { content, page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size), hasNext: start + size < items.length };
}

function ingredientStartsWord(name: string, term: string) {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s(/-])${escapedTerm}`, 'i').test(name);
}

function toRecipe(body: RecipeRequest, id: number, previous?: RecipeDetail): RecipeDetail {
  const category = categories.find((item) => item.id === body.categoryId);
  if (!category) throw new Error('Mock invariant: recipe category must be seeded');
  return {
    id,
    title: body.title,
    description: body.description ?? null,
    imageUrl: body.imageUrl ?? null,
    cookingTimeMinutes: body.cookingTimeMinutes,
    servings: body.servings,
    category: { id: category.id, name: category.name },
    isFavorited: false,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ingredients: body.ingredients.map((ingredient) => ({ name: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit ?? null })),
    instructions: body.instructions.map((instruction, index) => ({ stepNumber: index + 1, description: instruction.description })),
  };
}

export const handlers = [
  http.post(apiPath('/auth/register'), async ({ request }) => {
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, requestPath(request));
    const body = parsed.data;
    if (users.has(body.email.toLowerCase())) return error(409, 'EMAIL_ALREADY_EXISTS', 'Email sudah terdaftar', apiPath('/auth/register'));
    const user: User = { id: users.size + 2, name: body.name.trim(), email: body.email, role: 'USER' };
    users.set(body.email.toLowerCase(), { user, password: body.password });
    return authResponse(user);
  }),
  http.post(apiPath('/auth/login'), async ({ request }) => {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, requestPath(request));
    const body = parsed.data;
    if (body.email.toLowerCase() === admin.email.toLowerCase() && body.password === adminPassword) return authResponse(admin);
    const account = users.get(body.email.toLowerCase());
    if (!account || account.password !== body.password) return error(401, 'INVALID_CREDENTIALS', 'Email atau password salah', apiPath('/auth/login'));
    return authResponse(account.user);
  }),
  http.post(apiPath('/auth/refresh'), ({ request }) => {
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
    const injectedRetryUser = token ? null : tokenExpiredRefreshUser;
    tokenExpiredRefreshUser = null;
    const user = token ? (refreshTokens.get(token) ?? decodeUser(token)) : injectedRetryUser;
    if (!user) return error(401, 'UNAUTHORIZED', 'Refresh token tidak valid', apiPath('/auth/refresh'));
    if (token) refreshTokens.delete(token);
    return authResponse(user);
  }),
  http.post(apiPath('/auth/logout'), ({ request }) => {
    const token = request.headers.get('cookie')?.match(/(?:^|;\s*)refreshToken=([^;]+)/)?.[1];
    if (token) refreshTokens.delete(token);
    tokenExpiredRefreshUser = null;
    return new HttpResponse(null, { status: 204, headers: { 'Set-Cookie': 'refreshToken=; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=0' } });
  }),
  http.get(apiPath('/categories'), () => HttpResponse.json(categories)),
  http.get(apiPath('/recipes'), ({ request }) => {
    const expired = maybeTokenExpired(request, requestPath(request));
    if (expired) return expired;
    const url = new URL(request.url);
    const paging = parsePageParams(request, requestPath(request));
    if ('response' in paging) return paging.response;
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const categoryId = url.searchParams.get('categoryId');
    const ingredients = url.searchParams.getAll('ingredient').map((value) => value.toLowerCase());
    let items = recipes.filter((recipe) =>
      (!q || recipe.title.toLowerCase().includes(q)) &&
      (!categoryId || recipe.category.id === Number(categoryId)) &&
      ingredients.every((term) => recipe.ingredients.some((ingredient) => ingredientStartsWord(ingredient.name, term))),
    );
    items = sortRecipes(items, paging.sort);
    return HttpResponse.json(pageOf(items, paging.page, paging.size, userFor(request)));
  }),
  http.get(apiPath('/recipes/:id'), ({ params, request }) => {
    const expired = maybeTokenExpired(request, requestPath(request));
    if (expired) return expired;
    const recipe = recipes.find((item) => item.id === Number(params.id));
    if (!recipe) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', requestPath(request));
    return HttpResponse.json(recipeDetail(recipe, userFor(request)));
  }),
  http.post(apiPath('/recipes'), async ({ request }) => {
    const auth = requireAdmin(request, apiPath('/recipes'));
    if ('response' in auth) return auth.response;
    const parsed = recipeSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, requestPath(request));
    if (!categories.some((category) => category.id === parsed.data.categoryId)) return invalidCategoryId(requestPath(request));
    const created = toRecipe(parsed.data, nextRecipeId++);
    recipes.unshift(created);
    return HttpResponse.json(recipeDetail(created, auth.user), { status: 201, headers: { Location: apiPath(`/recipes/${created.id}`) } });
  }),
  http.put(apiPath('/recipes/:id'), async ({ params, request }) => {
    const auth = requireAdmin(request, requestPath(request));
    if ('response' in auth) return auth.response;
    const index = recipes.findIndex((item) => item.id === Number(params.id));
    if (index < 0) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', requestPath(request));
    const parsed = recipeSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, requestPath(request));
    if (!categories.some((category) => category.id === parsed.data.categoryId)) return invalidCategoryId(requestPath(request));
    recipes[index] = toRecipe(parsed.data, recipes[index].id, recipes[index]);
    return HttpResponse.json(recipeDetail(recipes[index], auth.user));
  }),
  http.delete(apiPath('/recipes/:id'), ({ params, request }) => {
    const auth = requireAdmin(request, requestPath(request));
    if ('response' in auth) return auth.response;
    const index = recipes.findIndex((item) => item.id === Number(params.id));
    if (index < 0) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', requestPath(request));
    const removedId = recipes[index].id;
    recipes.splice(index, 1);
    for (const list of [comments, reviews] as { recipeId: number }[][]) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].recipeId === removedId) list.splice(i, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.put(apiPath('/recipes/:id/favorite'), ({ params, request }) => {
    const auth = requireUser(request, requestPath(request));
    if ('response' in auth) return auth.response;
    const recipeId = Number(params.id);
    if (!recipes.some((item) => item.id === recipeId)) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', requestPath(request));
    const collection = favorites.get(auth.user.id) ?? new Set<number>();
    collection.add(recipeId);
    favorites.set(auth.user.id, collection);
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete(apiPath('/recipes/:id/favorite'), ({ params, request }) => {
    const auth = requireUser(request, requestPath(request));
    if ('response' in auth) return auth.response;
    favorites.get(auth.user.id)?.delete(Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(apiPath('/users/me'), ({ request }) => {
    const auth = requireUser(request, requestPath(request));
    return 'response' in auth ? auth.response : HttpResponse.json(auth.user);
  }),
  http.patch(apiPath('/users/me'), async ({ request }) => {
    const auth = requireUser(request, requestPath(request));
    if ('response' in auth) return auth.response;
    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, requestPath(request));
    const updated = { ...auth.user, name: parsed.data.name };
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (bearer) tokenUsers.set(bearer, updated);
    if (updated.email === admin.email) return HttpResponse.json(updated);
    users.set(updated.email.toLowerCase(), { user: updated, password: users.get(updated.email.toLowerCase())?.password ?? '' });
    return HttpResponse.json(updated);
  }),
  http.get(apiPath('/users/me/favorites'), ({ request }) => {
    const auth = requireUser(request, requestPath(request));
    if ('response' in auth) return auth.response;
    const paging = parsePageParams(request, requestPath(request));
    if ('response' in paging) return paging.response;
    const ids = favorites.get(auth.user.id) ?? new Set<number>();
    const selected = sortRecipes(recipes.filter((recipe) => ids.has(recipe.id)), paging.sort);
    return HttpResponse.json(pageOf(selected, paging.page, paging.size, auth.user));
  }),

  // ---- v2.4.0: komentar ----
  http.get(apiPath('/recipes/:id/comments'), ({ params, request }) => {
    const path = requestPath(request);
    const recipeId = Number(params.id);
    if (!recipeExists(recipeId)) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', path);
    const paging = parsePageParams(request, path);
    if ('response' in paging) return paging.response;
    const topLevel = comments.filter((item) => item.recipeId === recipeId && item.parentId === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(commentTree);
    return HttpResponse.json({ ...pageSlice(topLevel, paging.page, paging.size), totalComments: comments.filter((item) => item.recipeId === recipeId).length });
  }),
  http.post(apiPath('/recipes/:id/comments'), async ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireUser(request, path);
    if ('response' in auth) return auth.response;
    const recipeId = Number(params.id);
    if (!recipeExists(recipeId)) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', path);
    const body = await request.json() as { content?: unknown; parentId?: unknown };
    const parsed = commentSchema.safeParse({ content: body.content, parentId: body.parentId ?? null });
    if (!parsed.success) return invalid(parsed.error, path);
    const parent = parsed.data.parentId === null ? null : comments.find((item) => item.id === parsed.data.parentId);
    if (parsed.data.parentId !== null && (!parent || parent.recipeId !== recipeId || parent.parentId !== null)) {
      return error(400, 'VALIDATION_ERROR', 'Data tidak valid', path, [{ field: 'parentId', message: 'Komentar yang dibalas tidak ditemukan' }]);
    }
    const created: CommentRecord = { id: nextCommentId++, recipeId, parentId: parsed.data.parentId, author: { id: auth.user.id, name: auth.user.name }, content: parsed.data.content, createdAt: new Date().toISOString() };
    comments.push(created);
    return HttpResponse.json({ ...created, replies: [] }, { status: 201 });
  }),
  http.delete(apiPath('/comments/:id'), ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireUser(request, path);
    if ('response' in auth) return auth.response;
    const comment = comments.find((item) => item.id === Number(params.id));
    if (!comment) return error(404, 'NOT_FOUND', 'Komentar tidak ditemukan', path);
    if (comment.author.id !== auth.user.id && auth.user.role !== 'ADMIN') return error(403, 'FORBIDDEN', 'Akses ditolak', path);
    for (let i = comments.length - 1; i >= 0; i--) if (comments[i].id === comment.id || comments[i].parentId === comment.id) comments.splice(i, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- v2.4.0: ulasan ----
  http.get(apiPath('/reviews/featured'), ({ request }) => {
    const size = Number(new URL(request.url).searchParams.get('size') ?? 5);
    if (!Number.isInteger(size) || size < 1 || size > 10) return error(400, 'VALIDATION_ERROR', 'Data tidak valid', requestPath(request), [{ field: 'size', message: 'Ukuran harus 1 sampai 10' }]);
    const featured = reviews.filter((review) => review.rating >= 4 && review.content)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, size)
      .map((review) => ({ ...publicReview(review), recipe: { id: review.recipeId, title: recipes.find((recipe) => recipe.id === review.recipeId)?.title ?? '' } }));
    return HttpResponse.json(featured);
  }),
  http.get(apiPath('/recipes/:id/reviews/me'), ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireUser(request, path);
    if ('response' in auth) return auth.response;
    const review = reviews.find((item) => item.recipeId === Number(params.id) && item.author.id === auth.user.id);
    return review ? HttpResponse.json(publicReview(review)) : error(404, 'NOT_FOUND', 'Ulasan tidak ditemukan', path);
  }),
  http.put(apiPath('/recipes/:id/reviews/me'), async ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireUser(request, path);
    if ('response' in auth) return auth.response;
    const recipeId = Number(params.id);
    if (!recipeExists(recipeId)) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', path);
    const body = await request.json() as { rating?: unknown; content?: unknown };
    const parsed = reviewSchema.safeParse({ rating: body.rating, content: body.content ?? null });
    if (!parsed.success) return invalid(parsed.error, path);
    const now = new Date().toISOString();
    const existing = reviews.find((item) => item.recipeId === recipeId && item.author.id === auth.user.id);
    if (existing) Object.assign(existing, { rating: parsed.data.rating, content: parsed.data.content, updatedAt: now });
    const review = existing ?? { id: nextReviewId++, recipeId, rating: parsed.data.rating, content: parsed.data.content, author: { id: auth.user.id, name: auth.user.name }, createdAt: now, updatedAt: now };
    if (!existing) reviews.push(review);
    return HttpResponse.json(publicReview(review));
  }),
  http.delete(apiPath('/recipes/:id/reviews/me'), ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireUser(request, path);
    if ('response' in auth) return auth.response;
    if (!recipeExists(Number(params.id))) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', path);
    const index = reviews.findIndex((item) => item.recipeId === Number(params.id) && item.author.id === auth.user.id);
    if (index >= 0) reviews.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(apiPath('/recipes/:id/reviews'), ({ params, request }) => {
    const path = requestPath(request);
    const recipeId = Number(params.id);
    if (!recipeExists(recipeId)) return error(404, 'NOT_FOUND', 'Resep tidak ditemukan', path);
    const paging = parsePageParams(request, path);
    if ('response' in paging) return paging.response;
    const items = reviews.filter((item) => item.recipeId === recipeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicReview);
    return HttpResponse.json(pageSlice(items, paging.page, paging.size));
  }),
  http.delete(apiPath('/reviews/:id'), ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireAdmin(request, path);
    if ('response' in auth) return auth.response;
    const index = reviews.findIndex((item) => item.id === Number(params.id));
    if (index < 0) return error(404, 'NOT_FOUND', 'Ulasan tidak ditemukan', path);
    reviews.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- v2.4.0: artikel ----
  http.get(apiPath('/articles/facets'), () => {
    const counts = new Map<string, number>();
    articles.forEach((article) => article.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return HttpResponse.json({
      categories: (['TIPS', 'CERITA', 'BAHAN', 'TEKNIK'] as const).map((category) => ({ category, count: articles.filter((article) => article.category === category).length })),
      tags: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([name, count]) => ({ name, count })),
    });
  }),
  http.get(apiPath('/articles'), ({ request }) => {
    const path = requestPath(request);
    const paging = parsePageParams(request, path);
    if ('response' in paging) return paging.response;
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const category = url.searchParams.get('category');
    const tag = url.searchParams.get('tag')?.toLowerCase();
    if (category && !['TIPS', 'CERITA', 'BAHAN', 'TEKNIK'].includes(category)) return error(400, 'VALIDATION_ERROR', 'Data tidak valid', path, [{ field: 'category', message: 'Kategori tidak dikenal' }]);
    const items = articlesByDate().filter((article) => (!q || article.title.toLowerCase().includes(q)) && (!category || article.category === category) && (!tag || article.tags.includes(tag)));
    return HttpResponse.json(pageSlice(items.map(articleSummary), paging.page, paging.size));
  }),
  http.get(apiPath('/articles/:id'), ({ params, request }) => {
    const article = articles.find((item) => item.id === Number(params.id));
    return article ? HttpResponse.json(articleDetail(article)) : error(404, 'NOT_FOUND', 'Artikel tidak ditemukan', requestPath(request));
  }),
  http.post(apiPath('/articles'), async ({ request }) => {
    const path = requestPath(request);
    const auth = requireAdmin(request, path);
    if ('response' in auth) return auth.response;
    const parsed = articleSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, path);
    const data = normalizeArticleDraft(parsed.data);
    const now = new Date().toISOString();
    const created: ArticleRecord = { id: nextArticleId++, ...data, author: { id: auth.user.id, name: auth.user.name }, publishedAt: now, updatedAt: now };
    articles.push(created);
    return HttpResponse.json(articleDetail(created), { status: 201, headers: { Location: apiPath(`/articles/${created.id}`) } });
  }),
  http.put(apiPath('/articles/:id'), async ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireAdmin(request, path);
    if ('response' in auth) return auth.response;
    const article = articles.find((item) => item.id === Number(params.id));
    if (!article) return error(404, 'NOT_FOUND', 'Artikel tidak ditemukan', path);
    const parsed = articleSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error, path);
    Object.assign(article, normalizeArticleDraft(parsed.data), { updatedAt: new Date().toISOString() });
    return HttpResponse.json(articleDetail(article));
  }),
  http.delete(apiPath('/articles/:id'), ({ params, request }) => {
    const path = requestPath(request);
    const auth = requireAdmin(request, path);
    if ('response' in auth) return auth.response;
    const index = articles.findIndex((item) => item.id === Number(params.id));
    if (index < 0) return error(404, 'NOT_FOUND', 'Artikel tidak ditemukan', path);
    articles.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- v2.4.0: foto ----
  http.post(apiPath('/images'), async ({ request }) => {
    const path = requestPath(request);
    const auth = requireAdmin(request, path);
    if ('response' in auth) return auth.response;
    const file = (await request.formData()).get('file');
    const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const fileError = !(file instanceof Blob) ? 'File wajib diunggah' : !types[file.type] ? 'Foto harus berformat JPEG, PNG, atau WebP' : file.size > 5 * 1024 * 1024 ? 'Ukuran foto maksimal 5 MB' : null;
    if (fileError || !(file instanceof Blob)) return error(400, 'VALIDATION_ERROR', 'Data tidak valid', path, [{ field: 'file', message: fileError ?? 'File wajib diunggah' }]);
    const name = `${Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}.${types[file.type]}`;
    images.set(name, file);
    return HttpResponse.json({ url: apiPath(`/images/${name}`) }, { status: 201 });
  }),
  http.get(apiPath('/images/:name'), ({ params, request }) => {
    const image = images.get(String(params.name));
    if (!image) return error(404, 'NOT_FOUND', 'Foto tidak ditemukan', requestPath(request));
    return new HttpResponse(image, { headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }),
];
