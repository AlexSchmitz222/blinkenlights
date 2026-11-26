/**
 * "Back" targets passed between pages as `?returnTo=/shows/abc`, so the back button returns to where
 * the user came from (e.g. the show editor) instead of a fixed page.
 *
 * Only app-internal paths are accepted, so a crafted link can't send people to another site.
 */
export function safeReturnUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}
