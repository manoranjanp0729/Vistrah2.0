import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeChatActionHref } from '../../shared/ask-vistrah';
import {
  DEFAULT_VIBE_RADIUS_KM,
  HOMEPAGE_EXCLUDED_CATEGORY_SLUGS,
  VIBE_FINDER_RADIUS_OPTIONS_KM,
  VIBE_MOODS,
  buildVibeFinderNearbyMapHref,
  dedupeAndSortVibeListings,
} from '../../shared/vibe-finder';
import { LanguageProvider } from '../components/language-provider';
import { MarketplaceCategories } from '../components/marketplace-categories';
import { VibeFinderDiscovery } from '../components/vibe-finder-discovery';
import copy from './interface-copy.json';
import { marketplaceCategories } from './marketplace-taxonomy';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function collectFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  const skipDirs = new Set(['node_modules', '.next', '.expo', 'dist', 'build', 'tests', 'scripts']);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !skipDirs.has(entry.name)) {
        collectFiles(join(dir, entry.name), out);
      }
      continue;
    }
    const name = entry.name;
    if (!/\.(ts|tsx|json)$/.test(name)) continue;
    if (
      /\.test\.|\.spec\.|\.bak$|conflict-backup|hero-backup|package(?:-lock)?\.json$|tsconfig.*\.json$|banner-artwork-replacements\.json$/.test(
        name,
      )
    ) {
      continue;
    }
    out.push(join(dir, name));
  }
  return out;
}

describe('Navigation, Products & Vibe Finder Tabs, and Services Near You', () => {
  it('purges V-Essentials, AgriConnect, and HealthConnect from routes, navigation, and taxonomy', () => {
    expect(existsSync(join(repoRoot, 'frontend', 'app', '(public)', 'v-essentials'))).toBe(false);
    expect(existsSync(join(repoRoot, 'frontend', 'app', '(public)', 'agri-connect'))).toBe(false);
    expect(existsSync(join(repoRoot, 'frontend', 'app', '(public)', 'health-connect'))).toBe(false);
    expect(existsSync(join(repoRoot, 'frontend', 'components', 'homepage-connect.tsx'))).toBe(false);
    expect(existsSync(join(repoRoot, 'shared', 'homepage-connect.ts'))).toBe(false);

    expect(sanitizeChatActionHref('/v-essentials')).toBeNull();
    expect(sanitizeChatActionHref('/agri-connect')).toBeNull();
    expect(sanitizeChatActionHref('/health-connect')).toBeNull();
    expect(sanitizeChatActionHref('/products')).toBe('/products');
    expect(sanitizeChatActionHref('/vibe-finder')).toBe('/vibe-finder');

    const taxonomyText = JSON.stringify(marketplaceCategories);
    expect(taxonomyText).not.toMatch(/v-essentials|agriconnect|healthconnect/i);

    const files = [
      ...collectFiles(join(repoRoot, 'shared')),
      ...collectFiles(join(repoRoot, 'frontend')),
      ...collectFiles(join(repoRoot, 'admin')),
    ];
    const forbiddenRe = /\bv-essentials\b|\bV Essentials\b|\bVistrah Essentials\b|\bAgriConnect\b|\bHealthConnect\b|\bServices for You\b/i;
    const violations: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (forbiddenRe.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('renames bottom/header navigation tabs to Products (/products) and Vibe Finder (/vibe-finder)', () => {
    expect(copy.nav.products).toBe('Products');
    expect(copy.nav.vibeFinder).toBe('Vibe Finder');

    const shellSrc = readFileSync(join(repoRoot, 'frontend', 'components', 'shell.tsx'), 'utf8');
    expect(shellSrc).toContain("href:'/products'");
    expect(shellSrc).toContain("key:'nav.products'");
    expect(shellSrc).toContain("href:'/vibe-finder'");
    expect(shellSrc).toContain("key:'nav.vibeFinder'");
    expect(shellSrc).not.toContain('/v-essentials');
    expect(shellSrc).not.toContain("key:'nav.services'");

    expect(existsSync(join(repoRoot, 'frontend', 'app', '(public)', 'products', 'page.tsx'))).toBe(
      true,
    );
    expect(
      existsSync(join(repoRoot, 'frontend', 'app', '(public)', 'vibe-finder', 'page.tsx')),
    ).toBe(true);
  });

  it('renames homepage heading to Services Near You, removes Vibe Finder from the homepage grid, and renders Vibe Finder discovery', () => {
    expect(copy.home.categories).toBe('Services Near You');
    expect(HOMEPAGE_EXCLUDED_CATEGORY_SLUGS).toEqual(['vibe-finder']);

    const homepageGridHtml = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(MarketplaceCategories, {
          compact: true,
          borderless: true,
          exclude: HOMEPAGE_EXCLUDED_CATEGORY_SLUGS,
        }),
      ),
    );
    expect(homepageGridHtml.match(/data-marketplace-category=/g)).toHaveLength(9);
    expect(homepageGridHtml).not.toContain('data-marketplace-category="vibe-finder"');
    expect(homepageGridHtml).toContain('data-borderless="true"');
    expect(homepageGridHtml).toContain('data-photo-rail="Services Near You"');

    // Dedicated Vibe Finder experience SSR renders mood tabs, radius pills, and location controls
    const vibeHtml = renderToStaticMarkup(
      createElement(LanguageProvider, null, createElement(VibeFinderDiscovery, { initialMoodId: 'theatres-cinema' })),
    );
    expect(vibeHtml).toContain('data-vibe-finder="true"');
    expect(vibeHtml).toContain('Vibe Finder');
    for (const mood of VIBE_MOODS) {
      expect(vibeHtml).toContain(mood.label.replaceAll('&', '&amp;'));
    }
    for (const km of VIBE_FINDER_RADIUS_OPTIONS_KM) {
      expect(vibeHtml).toContain(`${km} km`);
    }
    expect(buildVibeFinderNearbyMapHref('theatres-cinema', DEFAULT_VIBE_RADIUS_KM)).toBe(
      '/services/nearby?category=vibe-finder&radius=10&subcategory=theatres&type=theatres',
    );

    const makeVibeFixture = (
      overrides: Partial<import('../../shared/nearby-services').NearbyBusinessItem> & {
        id: string;
        name: string;
        distance_km: number;
      },
    ): import('../../shared/nearby-services').NearbyBusinessItem => ({
      source: 'vistrah',
      slug: overrides.id,
      owner_user_id: null,
      place_id: null,
      company: overrides.name,
      contact_name: '',
      category_slug: 'vibe-finder',
      business_type: 'theatres',
      service_title: 'Theatres',
      description: '',
      address: 'Indiranagar',
      location: 'Bengaluru',
      latitude: 12.97,
      longitude: 77.6,
      coverage_radius_km: 10,
      verification_status: 'VERIFIED',
      phone: '',
      whatsapp: '',
      timings: '',
      photo_url: null,
      website_url: null,
      directions_url: '',
      ...overrides,
    });

    const sorted = dedupeAndSortVibeListings(
      [
        [
          makeVibeFixture({
            id: 'b',
            source: 'google_places',
            name: 'Far Lounge',
            company: 'Far Lounge',
            category_slug: 'restaurants-and-dining',
            business_type: 'pubs',
            service_title: 'Pubs',
            distance_km: 4.8,
          }),
        ],
        [
          makeVibeFixture({
            id: 'a',
            source: 'vistrah',
            name: 'Cauvery Cinema',
            company: 'Cauvery Cinema',
            distance_km: 1.2,
          }),
          makeVibeFixture({
            id: 'b',
            source: 'google_places',
            name: 'Far Lounge',
            company: 'Far Lounge',
            category_slug: 'restaurants-and-dining',
            business_type: 'pubs',
            service_title: 'Pubs',
            distance_km: 4.8,
          }),
        ],
      ],
      'Cinema',
    );
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('a');
  });
});
