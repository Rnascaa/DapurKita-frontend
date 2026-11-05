import { http, HttpResponse } from 'msw';
import type { components } from '../api/generated/openapi';
import { API_BASE_URL } from '../api/client';
import { loginSchema, profileSchema, registerSchema } from '../features/auth/validation';
import { recipeSchema } from '../features/recipes/validation';
import { categories, recipes, type RecipeDetail } from './fixtures';

type User = components['schemas']['User'];
type AuthResponse = components['schemas']['AuthResponse'];
type RecipeRequest = components['schemas']['RecipeRequest'];
type ErrorResponse = components['schemas']['ErrorResponse'];

const users = new Map<string, { user: User; password: string }>();
const refreshTokens = new Map<string, User>();
const favorites = new Map<number, Set<number>>();
let nextRecipeId = 4;
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
    createdAt: recipe.createdAt,
  };
}

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
    recipes.splice(index, 1);
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
];
