import type { components } from './generated/openapi';

export type User = components['schemas']['User'];
export type AuthResponse = components['schemas']['AuthResponse'];

export interface SessionSnapshot {
  user: User | null;
  ready: boolean;
}

let accessToken: string | null = null;
let snapshot: SessionSnapshot = { user: null, ready: false };
const listeners = new Set<() => void>();

export function getAccessToken() {
  return accessToken;
}

export function getSessionSnapshot() {
  return snapshot;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSession(response: AuthResponse) {
  accessToken = response.accessToken;
  snapshot = { user: response.user, ready: true };
  listeners.forEach((listener) => listener());
}

export function updateSessionUser(user: User) {
  snapshot = { ...snapshot, user };
  listeners.forEach((listener) => listener());
}

export function finishSessionRestore(user: User | null) {
  snapshot = { user, ready: true };
  listeners.forEach((listener) => listener());
}

export function clearSession() {
  accessToken = null;
  snapshot = { user: null, ready: true };
  listeners.forEach((listener) => listener());
}

export function announceSessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dapurkita:session-expired'));
  }
}
