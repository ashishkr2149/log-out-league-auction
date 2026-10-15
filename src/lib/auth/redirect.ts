/**
 * Safe post-login redirect: only relative same-origin paths.
 * Rejects protocol-relative URLs, absolute URLs, and control characters.
 */
export function sanitizeRedirectPath(
  redirectTo: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!redirectTo) return fallback;

  const value = redirectTo.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('\\')) return fallback;
  if (/[\x00-\x1f\x7f]/.test(value)) return fallback;
  if (value.includes('://')) return fallback;

  // Block navigating to auth pages via redirect loops
  if (value === '/login' || value.startsWith('/login?')) return fallback;

  return value;
}
