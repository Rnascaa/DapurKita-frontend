/** Router state is untrusted: accept only same-origin absolute paths. */
export function safeInternalPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback;
  try {
    const target = new URL(value, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
