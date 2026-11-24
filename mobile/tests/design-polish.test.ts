import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ADS_STUDIO_PILLARS, BUSINESS_TIMELINE } from '../../shared/hero-banners.ts';
import { photoCardDesign } from '../../shared/photo-card-design.ts';

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
    if (!/\.(ts|tsx|css|json)$/.test(name)) continue;
    if (
      /\.test\.|\.spec\.|package(?:-lock)?\.json$|tsconfig.*\.json$|hi\.json$|kn\.json$|banner-artwork-replacements\.json$/.test(
        name,
      )
    ) {
      continue;
    }
    out.push(join(dir, name));
  }
  return out;
}

test('mobile & shared enforce cohesive 12px/8px/9999px geometry and Discover. Connect. Grow. copy', () => {
  assert.equal(photoCardDesign.radius, 12);
  assert.equal(photoCardDesign.imageRadius, 8);
  assert.deepEqual(
    BUSINESS_TIMELINE.map(item => item.step),
    ['Discover', 'Connect', 'Grow'],
  );
  assert.equal(
    ADS_STUDIO_PILLARS.every(p => !/^0\d$/.test(p.num)),
    true,
  );

  const themeSrc = readFileSync(join(repoRoot, 'mobile', 'src', 'lib', 'theme.ts'), 'utf8');
  assert.match(themeSrc, /input:\s*8\b/);
  assert.match(themeSrc, /action:\s*8\b/);
  assert.match(themeSrc, /surface:\s*12\b/);
  assert.match(themeSrc, /pill:\s*9999\b/);
  assert.match(themeSrc, /sectionPadding:\s*24\b/);

  const copySrc = readFileSync(join(repoRoot, 'mobile', 'src', 'lib', 'interface-copy.ts'), 'utf8');
  assert.ok(copySrc.includes('Discover. Connect. Grow.'));
  assert.ok(copySrc.includes('Find verified businesses near you'));
  assert.ok(copySrc.includes('List your business for ₹0'));
});

test('mobile/src & shared have zero purple classes, zero "800+", zero stray sparkles outside Astra, and zero "Why VISTRAH?" sections', () => {
  assert.equal(existsSync(join(repoRoot, 'mobile', 'src', 'components', 'why-vistrah.tsx')), false);

  const files = [
    ...collectFiles(join(repoRoot, 'mobile', 'src')),
    ...collectFiles(join(repoRoot, 'shared')),
  ];

  const purpleClassRe =
    /\b(?:from|via|to)-(?:purple|violet|indigo|fuchsia)(?:-[a-z0-9/]+)?\b|\b(?:text|bg|border|ring|shadow)-(?:purple|violet|indigo|fuchsia)-[0-9]{2,3}\b/i;
  const stale800Re = /800\+/;
  const whyVistrahRe = /Why VISTRAH\?/i;
  const sparkleRe = /✨|\bSparkles\b/;

  const violations: string[] = [];

  for (const file of files) {
    const isAstraFile = /ask-vistrah/i.test(file);
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (purpleClassRe.test(line)) violations.push(`purple ${file}:${idx + 1}`);
      if (stale800Re.test(line)) violations.push(`800+ ${file}:${idx + 1}`);
      if (whyVistrahRe.test(line)) violations.push(`why-vistrah ${file}:${idx + 1}`);
      if (!isAstraFile && sparkleRe.test(line)) violations.push(`sparkle ${file}:${idx + 1}`);
    });
  }

  assert.deepEqual(violations, []);
});

test('mobile public screens & components have zero border-l-4/border-t-4 accent stripes and zero 01/02/03 watermark step cards', () => {
  const files = [
    ...collectFiles(join(repoRoot, 'mobile', 'src', 'app')),
    ...collectFiles(join(repoRoot, 'mobile', 'src', 'components')),
  ];

  const stripeRe = /\bborder-(?:l|t)-4\b|borderLeftWidth\s*:\s*[34]\b|borderTopWidth\s*:\s*[34]\b/;
  const stepWatermarkRe =
    /0\$\{index\s*\+\s*1\}|\bSTEP\s+0[1-9]\b|\b0[1-9]\s*\/\s*0[1-9]\b|\bPAID\s+(?:AGENCY|TECH)\s+TRACK\s+0[1-9]\b/;

  const violations: string[] = [];

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (stripeRe.test(line)) violations.push(`stripe ${file}:${idx + 1}: ${line.trim()}`);
      if (stepWatermarkRe.test(line)) violations.push(`step-watermark ${file}:${idx + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(violations, []);
});
