import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldShowMainHeader } from '../../shared/header-visibility';
import { LanguageProvider } from '../components/language-provider';
import { Header } from '../components/shell';
import { ThemeProvider } from '../components/theme-provider';

const mockState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement('img', { alt, src }),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function renderHeaderAt(pathname: string): string {
  mockState.pathname = pathname;
  return renderToStaticMarkup(
    createElement(LanguageProvider, {
      children: createElement(ThemeProvider, {
        initialMode: 'light',
        children: createElement(Header),
      }),
    }),
  );
}

describe('Homepage-only Main Top Navigation Header (Web)', () => {
  beforeEach(() => {
    mockState.pathname = '/';
  });

  it('renders the main .public-header exclusively when pathname === "/"', () => {
    expect(shouldShowMainHeader('/')).toBe(true);
    const homeHtml = renderHeaderAt('/');
    expect(homeHtml).toContain('<header class="public-header">');
    expect(homeHtml).toContain('class="desktop-nav replica-navigation"');
    expect(homeHtml).toContain('class="replica-bottom-nav"');
  });

  it('suppresses .public-header on /services, /services/nearby, /products, /vibe-finder, /v-ads, and all inner routes with zero fixed-header top spacer padding', () => {
    const innerRoutes = [
      '/services',
      '/services/nearby',
      '/products',
      '/vibe-finder',
      '/v-ads',
      '/business/42',
      '/commerce/cart',
      '/account',
      '/login',
      '/seller/onboard',
      '/pricing',
      '/privacy',
    ];

    for (const route of innerRoutes) {
      expect(shouldShowMainHeader(route)).toBe(false);
      const html = renderHeaderAt(route);
      expect(html).not.toContain('public-header');
      expect(html).not.toContain('<header');
      // Bottom navigation bar and skip-link remain available
      expect(html).toContain('class="replica-bottom-nav"');
    }

    const publicLayout = readFileSync(
      join(repoRoot, 'frontend', 'app', '(public)', 'layout.tsx'),
      'utf8',
    );
    const protectedLayout = readFileSync(
      join(repoRoot, 'frontend', 'app', '(protected)', 'layout.tsx'),
      'utf8',
    );
    for (const layoutSrc of [publicLayout, protectedLayout]) {
      expect(layoutSrc).not.toMatch(/\bpt-(?:16|20|24)\b/);
    }
  });
});
