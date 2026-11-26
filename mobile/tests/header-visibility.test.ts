import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  isMobileTabRootPath,
  normalizeAppPathname,
  shouldShowMainHeader,
} from '../../shared/header-visibility.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

test('shouldShowMainHeader allows only Home ("/" and "/app/") and suppresses all inner routes', () => {
  assert.equal(shouldShowMainHeader('/'), true);
  assert.equal(shouldShowMainHeader('/app'), true);
  assert.equal(shouldShowMainHeader('/app/'), true);

  const innerRoutes = [
    '/services',
    '/services/nearby',
    '/products',
    '/vibe-finder',
    '/v-ads',
    '/business/12',
    '/account',
    '/auth',
    '/seller/onboard',
    '/commerce/cart',
    '/app/services',
    '/app/products',
    '/app/vibe-finder',
    '/app/v-ads',
    '/location',
    '/app/location',
  ];
  for (const route of innerRoutes) {
    assert.equal(shouldShowMainHeader(route), false, `Expected header hidden on ${route}`);
  }

  assert.equal(normalizeAppPathname('/app/vibe-finder/'), '/vibe-finder');
  assert.equal(isMobileTabRootPath('/products'), true);
  assert.equal(isMobileTabRootPath('/vibe-finder'), true);
  assert.equal(isMobileTabRootPath('/services/nearby'), false);
});

test('mobile Stack and Tabs configure headerShown: false everywhere except the Home index tab, with SafeAreaView top insets preserved', () => {
  const rootLayout = readFileSync(join(repoRoot, 'mobile', 'src', 'app', '_layout.tsx'), 'utf8');
  assert.ok(rootLayout.includes('screenOptions={{headerShown:false'));
  assert.equal(rootLayout.includes('<AppHeader'), false);

  const tabsLayout = readFileSync(
    join(repoRoot, 'mobile', 'src', 'app', '(tabs)', '_layout.tsx'),
    'utf8',
  );
  assert.ok(tabsLayout.includes('screenOptions={{headerShown:false'));
  assert.ok(tabsLayout.includes('const showHomeHeader=shouldShowMainHeader(pathname);'));
  assert.ok(tabsLayout.includes('<Tabs.Screen name="index" options={{headerShown:showHomeHeader,header:()=> showHomeHeader?<AppHeader/>:null'));
  assert.ok(tabsLayout.includes('<Tabs.Screen name="products" options={{headerShown:false'));
  assert.ok(tabsLayout.includes('<Tabs.Screen name="vibe-finder" options={{headerShown:false'));
  assert.ok(tabsLayout.includes('<Tabs.Screen name="account" options={{headerShown:false'));

  const appHeaderSrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'components', 'app-header.tsx'),
    'utf8',
  );
  assert.ok(appHeaderSrc.includes('if(!shouldShowMainHeader(pathname))return null;'));

  const uiSrc = readFileSync(join(repoRoot, 'mobile', 'src', 'components', 'ui.tsx'), 'utf8');
  assert.ok(uiSrc.includes("['top','left','right','bottom']"));

  const servicesSrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'app', 'services', 'index.tsx'),
    'utf8',
  );
  assert.ok(servicesSrc.includes("edges={['top', 'left', 'right']}"));

  const nearbySrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'app', 'services', 'nearby.tsx'),
    'utf8',
  );
  assert.ok(nearbySrc.includes("edges={['top', 'left', 'right']}"));
  assert.equal(nearbySrc.includes('BannerGeometry'), false);

  const locationPickerSrc = readFileSync(
    join(repoRoot, 'mobile', 'src', 'components', 'map-first-location-picker.tsx'),
    'utf8',
  );
  assert.ok(locationPickerSrc.includes('#0D9488'));
  assert.ok(locationPickerSrc.includes('#0F766E'));
  assert.equal(locationPickerSrc.toLowerCase().includes('#d4af37'), false);
  assert.equal(locationPickerSrc.toLowerCase().includes('#0f172a'), false);
});
