import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  body,
  caption,
  cardTitle,
  control,
  screenTitle,
  sectionTitle,
  typographyTokens,
} from './typography.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

test('centralized Swiggy/Myntra typography tokens enforce exact sizes, line-heights, and zero 700+ weights', () => {
  assert.deepEqual(screenTitle, { fontSize: 20, lineHeight: 26, fontWeight: '600' });
  assert.deepEqual(sectionTitle, { fontSize: 18, lineHeight: 24, fontWeight: '600' });
  assert.deepEqual(cardTitle, { fontSize: 14, lineHeight: 20, fontWeight: '500' });
  assert.deepEqual(body, { fontSize: 13, lineHeight: 19, fontWeight: '400' });
  assert.deepEqual(control, { fontSize: 13, lineHeight: 18, fontWeight: '500' });
  assert.equal(caption.minFontSize, 11);
  assert.equal(caption.maxFontSize, 12);
  assert.equal(caption.fontSize, 12);
  assert.equal(caption.lineHeight, 16);
  assert.equal(caption.fontWeight, '400');
  assert.equal(caption.mediumWeight, '500');

  for (const [key, token] of Object.entries(typographyTokens)) {
    const numericWeight = Number(token.fontWeight);
    assert.ok(
      numericWeight >= 400 && numericWeight <= 600,
      `Token ${key} weight ${token.fontWeight} must be between 400 and 600 (never 700+)`,
    );
  }

  const uiTokens = JSON.parse(fs.readFileSync(path.join(repoRoot, 'shared/ui-tokens.json'), 'utf8'));
  assert.deepEqual(uiTokens.typography, {
    title: 20,
    heading: 18,
    cardTitle: 14,
    body: 13,
    supporting: 12,
    action: 13,
  });
});

test('shared, frontend, mobile, and admin UI sources contain zero font-bold / 700+ heavy bold weights', () => {
  const roots = ['shared', 'frontend', 'mobile/src', 'admin'];
  const skipDirs = new Set([
    'node_modules',
    '.next',
    'dist',
    'build',
    'out',
    'coverage',
    '.expo',
    'tests',
    'e2e',
    'test-results',
    'playwright-report',
  ]);
  const exts = new Set(['.ts', '.tsx', '.css', '.json']);
  const heavyBoldRe =
    /\bfont-(?:bold|extrabold|black)\b|fontWeight[^\r\n]*['"]?(?:650|700|800|900|bold|bolder)['"]?|font-weight\s*:\s*(?:650|700|800|900|bold|bolder)\b|--weight-bold\s*:\s*(?:700|800|900)/i;

  const violations: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skipDirs.has(ent.name) || ent.name.startsWith('.next')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = path.extname(ent.name);
      if (
        !exts.has(ext) ||
        ent.name.endsWith('.test.ts') ||
        ent.name.endsWith('.test.tsx') ||
        ent.name === 'package-lock.json'
      ) {
        continue;
      }
      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (heavyBoldRe.test(line)) {
          violations.push(`${path.relative(repoRoot, full)}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
  }

  for (const r of roots) {
    walk(path.join(repoRoot, r));
  }

  assert.deepEqual(violations, []);
});
