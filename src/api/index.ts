import type { components, paths } from './generated/openapi';
import { api } from './client';

export { api, API_BASE_URL, restoreSession } from './client';
export type { AuthResponse, SessionSnapshot, User } from './session';
export { clearSession, getSessionSnapshot, setSession, subscribeSession, updateSessionUser } from './session';

type RecipeListQuery = NonNullable<paths['/recipes']['get']['parameters']>['query'];
type RecipeRequest = components['schemas']['RecipeRequest'];
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
