import type { components, paths } from './generated/openapi';
import { api } from './client';

export { api, API_BASE_URL, restoreSession } from './client';
export type { AuthResponse, SessionSnapshot, User } from './session';
export { clearSession, getSessionSnapshot, setSession, subscribeSession, updateSessionUser } from './session';

type RecipeListQuery = NonNullable<paths['/recipes']['get']['parameters']>['query'];
type ArticleListQuery = NonNullable<paths['/articles']['get']['parameters']>['query'];
type PageQuery = { page?: number; size?: number };
type RecipeRequest = components['schemas']['RecipeRequest'];
type ArticleRequest = components['schemas']['ArticleRequest'];
type CommentRequest = components['schemas']['CommentRequest'];
type ReviewRequest = components['schemas']['ReviewRequest'];
type RegisterRequest = components['schemas']['RegisterRequest'];
type LoginRequest = components['schemas']['LoginRequest'];
type UpdateProfileRequest = components['schemas']['UpdateProfileRequest'];

export const authApi = {
  login: (body: LoginRequest) => api.POST('/auth/login', { body }),
  register: (body: RegisterRequest) => api.POST('/auth/register', { body }),
  logout: () => api.POST('/auth/logout'),
};

export const recipeApi = {
  list: (query: RecipeListQuery) => api.GET('/recipes', { params: { query } }),
  detail: (id: number) => api.GET('/recipes/{id}', { params: { path: { id } } }),
  create: (body: RecipeRequest) => api.POST('/recipes', { body }),
  replace: (id: number, body: RecipeRequest) =>
    api.PUT('/recipes/{id}', { params: { path: { id } }, body }),
  remove: (id: number) => api.DELETE('/recipes/{id}', { params: { path: { id } } }),
  favorite: (id: number) => api.PUT('/recipes/{id}/favorite', { params: { path: { id } } }),
  unfavorite: (id: number) => api.DELETE('/recipes/{id}/favorite', { params: { path: { id } } }),
};

export const commentApi = {
  list: (recipeId: number, query: PageQuery) =>
    api.GET('/recipes/{id}/comments', { params: { path: { id: recipeId }, query } }),
  create: (recipeId: number, body: CommentRequest) =>
    api.POST('/recipes/{id}/comments', { params: { path: { id: recipeId } }, body }),
  remove: (id: number) => api.DELETE('/comments/{id}', { params: { path: { id } } }),
};

export const reviewApi = {
  list: (recipeId: number, query: PageQuery) =>
    api.GET('/recipes/{id}/reviews', { params: { path: { id: recipeId }, query } }),
  mine: (recipeId: number) => api.GET('/recipes/{id}/reviews/me', { params: { path: { id: recipeId } } }),
  save: (recipeId: number, body: ReviewRequest) =>
    api.PUT('/recipes/{id}/reviews/me', { params: { path: { id: recipeId } }, body }),
  removeMine: (recipeId: number) => api.DELETE('/recipes/{id}/reviews/me', { params: { path: { id: recipeId } } }),
  removeAny: (id: number) => api.DELETE('/reviews/{id}', { params: { path: { id } } }),
  featured: (size = 5) => api.GET('/reviews/featured', { params: { query: { size } } }),
};

export const articleApi = {
  list: (query: ArticleListQuery) => api.GET('/articles', { params: { query } }),
  facets: () => api.GET('/articles/facets'),
  detail: (id: number) => api.GET('/articles/{id}', { params: { path: { id } } }),
  create: (body: ArticleRequest) => api.POST('/articles', { body }),
  replace: (id: number, body: ArticleRequest) => api.PUT('/articles/{id}', { params: { path: { id } }, body }),
  remove: (id: number) => api.DELETE('/articles/{id}', { params: { path: { id } } }),
};

export const imageApi = {
  upload: (file: File) => api.POST('/images', {
    // openapi-fetch mengirim JSON secara bawaan; foto harus multipart/form-data.
    body: { file: file as unknown as string },
    bodySerializer: (body) => {
      const form = new FormData();
      form.append('file', body.file as unknown as Blob);
      return form;
    },
  }),
};

export const userApi = {
  profile: () => api.GET('/users/me'),
  updateProfile: (body: UpdateProfileRequest) => api.PATCH('/users/me', { body }),
  favorites: (query: NonNullable<paths['/users/me/favorites']['get']['parameters']>['query']) =>
    api.GET('/users/me/favorites', { params: { query } }),
};

const fetchCategories = () => api.GET('/categories');
let cachedCategories: ReturnType<typeof fetchCategories> | undefined;
export const categoryApi = {
  list: () => (cachedCategories ??= fetchCategories()),
};
