/**
 * Shared predicate enforcing that the main VISTRAH top navigation header
 * renders exclusively on the Homepage (`/` on web and `/` or `/app/` Home screen on mobile).
 */
export function normalizeAppPathname(pathname?: string | null): string {
  if (!pathname || typeof pathname !== 'string') return '';
  const clean = pathname.split(/[?#]/, 1)[0].trim();
  if (!clean) return '';
  const stripped = clean.replace(/^\/app(?=\/|$)/, '') || '/';
  return stripped.length > 1 ? stripped.replace(/\/+$/, '') : stripped;
}

export function shouldShowMainHeader(pathname?: string | null): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  const clean = pathname.split(/[?#]/, 1)[0].trim();
  return clean === '/' || clean === '/app' || clean === '/app/';
}

const MOBILE_TAB_ROOT_PATHS = new Set([
  '/',
  '/products',
  '/v-ads',
  '/vibe-finder',
  '/account',
]);

export function isMobileTabRootPath(pathname?: string | null): boolean {
  const normalized = normalizeAppPathname(pathname);
  return MOBILE_TAB_ROOT_PATHS.has(normalized);
}
