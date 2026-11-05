import createClient from 'openapi-fetch';
import type { paths } from './generated/openapi';
import {
  announceSessionExpired,
  clearSession,
  finishSessionRestore,
  getAccessToken,
  setSession,
} from './session';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const rawFetch = globalThis.fetch.bind(globalThis);
let refreshInFlight: Promise<boolean> | null = null;

function requestPath(input: RequestInfo | URL) {
  const value = input instanceof Request ? input.url : String(input);
  return new URL(value, window.location.origin).pathname;
}

function isAuthPath(path: string) {
  return path.startsWith(`${API_BASE_URL}/auth/`);
}

async function refreshSessionOnce() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await rawFetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (response.status === 401) {
          return false;
        }
        if (!response.ok) {
          clearSession();
          return false;
        }
        setSession((await response.json()) as import('./session').AuthResponse);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const path = requestPath(input);
  const authRequest = isAuthPath(path);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: authRequest ? 'include' : (init?.credentials ?? 'same-origin'),
  };
  // Keep a pristine body stream for the single retry after refresh. Request bodies
  // are consumed by fetch, so the original input cannot be reused for POST/PUT/PATCH.
  const firstRequest = new Request(input, requestInit);
  const retryRequest = firstRequest.clone();
  const response = await rawFetch(firstRequest);
  if (response.status !== 401 || authRequest || !token) return response;

  const error = (await response.clone().json().catch(() => null)) as { code?: string } | null;
  if (error?.code === 'TOKEN_EXPIRED') {
    const refreshed = await refreshSessionOnce();
    if (refreshed) {
      const nextToken = getAccessToken();
      if (nextToken) retryRequest.headers.set('Authorization', `Bearer ${nextToken}`);
      const retry = await rawFetch(retryRequest);
      if (retry.status !== 401) return retry;
    }
  }

  clearSession();
  announceSessionExpired();
  return response;
}

/** Typed OpenAPI client. Request/response types are generated from openapi.yaml. */
export const api = createClient<paths>({ baseUrl: API_BASE_URL, fetch: authFetch });

/** Run once before mounting routes or requesting recipes. */
export async function restoreSession() {
  const restored = await refreshSessionOnce();
  if (!restored) finishSessionRestore(null);
}
