import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sanitizeChatActionHref } from '../../shared/ask-vistrah.ts';
import {
  DEFAULT_VIBE_RADIUS_KM,
  HOMEPAGE_EXCLUDED_CATEGORY_SLUGS,
  VIBE_FINDER_RADIUS_OPTIONS_KM,
  VIBE_MOODS,
  buildVibeFinderNearbyMapHref,
} from '../../shared/vibe-finder.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function collectFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  const skipDirs = new Set(['node_modules', '.next', '.expo', 'dist', 'build', 'tests']);
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

test('mobile purges V-Essentials, AgriConnect, and HealthConnect from tabs, stack routes, and source', () => {
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'app', 'v-essentials.tsx')), false);
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'app', 'agri-connect.tsx')), false);
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'app', 'health-connect.tsx')), false);
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'app', '(tabs)', 'requests.tsx')), false);
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'app', '(tabs)', 'services')), false);
  assert.equal(
    existsSync(join(repoRoot, 'mobile', 'src', 'components', 'homepage-connect.tsx')),
    false,
  );

  assert.equal(sanitizeChatActionHref('/v-essentials'), null);
  assert.equal(sanitizeChatActionHref('/agri-connect'), null);
  assert.equal(sanitizeChatActionHref('/health-connect'), null);
  assert.equal(sanitizeChatActionHref('/products'), '/products');
  assert.equal(sanitizeChatActionHref('/vibe-finder'), '/vibe-finder');

  const files = [
    ...collectFiles(join(repoRoot, 'mobile', 'src')),
    ...collectFiles(join(repoRoot, 'shared')),
  ];
  const forbiddenRe =
    /\bv-essentials\b|\bV Essentials\b|\bVistrah Essentials\b|\bAgriConnect\b|\bHealthConnect\b|\bServices for You\b/i;
  const violations: string[] = [];

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (forbiddenRe.test(line)) {
        violations.push(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(violations, []);
});

test('mobile bottom tab bar exposes Products and Vibe Finder tabs and preserves standalone /services', () => {
  const tabsLayout = readFileSync(
    join(repoRoot, 'mobile', 'src', 'app', '(tabs)', '_layout.tsx'),
    'utf8',
  );
  assert.ok(tabsLayout.includes('name="products"'));
  assert.ok(tabsLayout.includes('title:copy.nav.products'));
  assert.ok(tabsLayout.includes('name="vibe-finder"'));
  assert.ok(tabsLayout.includes('title:copy.nav.vibeFinder'));
  assert.equal(tabsLayout.includes('V Essentials'), false);
  assert.equal(tabsLayout.includes('name="services"'), false);
  assert.equal(tabsLayout.includes('name="requests"'), false);

  assert.equal(
    existsSync(join(repoRoot, 'mobile', 'src', 'app', '(tabs)', 'products.tsx')),
    true,
  );
  assert.equal(
    existsSync(join(repoRoot, 'mobile', 'src', 'app', '(tabs)', 'vibe-finder.tsx')),
    true,
  );
  assert.equal(
    existsSync(join(repoRoot, 'mobile', 'src', 'app', 'services', 'index.tsx')),
    true,
  );
});

test('mobile homepage uses Services Near You, excludes Vibe Finder from homepage grid, and wires Vibe Finder discovery', () => {
  const copySrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'lib', 'interface-copy.ts'),
    'utf8',
  );
  assert.ok(copySrc.includes('"products": "Products"'));
  assert.ok(copySrc.includes('"vibeFinder": "Vibe Finder"'));
  assert.ok(copySrc.includes('"categories": "Services Near You"'));
  assert.equal(/Services for [Yy]ou\b/.test(copySrc), false);

  const homeSrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'app', '(tabs)', 'index.tsx'),
    'utf8',
  );
  assert.ok(homeSrc.includes('exclude={HOMEPAGE_EXCLUDED_CATEGORY_SLUGS}'));
  assert.deepEqual(HOMEPAGE_EXCLUDED_CATEGORY_SLUGS, ['vibe-finder']);

  const vibeComponentSrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'components', 'vibe-finder-discovery.tsx'),
    'utf8',
  );
  assert.ok(vibeComponentSrc.includes('VIBE_MOODS'));
  assert.ok(vibeComponentSrc.includes('VIBE_FINDER_RADIUS_OPTIONS_KM'));
  assert.equal(VIBE_MOODS.length, 7);
  assert.deepEqual(VIBE_FINDER_RADIUS_OPTIONS_KM, [2, 5, 10, 25, 50]);
  assert.equal(
    buildVibeFinderNearbyMapHref('social-live', DEFAULT_VIBE_RADIUS_KM),
    '/services/nearby?category=vibe-finder&radius=10&subcategory=social-events&type=social-events',
  );
});
