import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ADS_STUDIO_PILLARS, BUSINESS_TIMELINE } from '../../shared/hero-banners';
import { photoCardDesign } from '../../shared/photo-card-design';
import copy from './interface-copy.json';

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
    if (!/\.(ts|tsx|css|scss|json)$/.test(name)) continue;
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

describe('Human-Crafted Design Polish ("De-AI Visual Overhaul") Guard', () => {
  it('enforces cohesive 12px / 8px / 9999px geometry and preserves Discover. Connect. Grow. brand copy', () => {
    expect(photoCardDesign.radius).toBe(12);
    expect(photoCardDesign.imageRadius).toBe(8);
    expect(copy.home.tagline).toBe('Discover. Connect. Grow.');
    expect(copy.home.title).toBe('Find verified businesses near you');
    expect(copy.home.business).toBe('List your business for ₹0');

    const globalsCss = readFileSync(join(repoRoot, 'frontend', 'app', 'globals.css'), 'utf8');
    expect(globalsCss).toMatch(/--radius-sm:\s*8px;/);
    expect(globalsCss).toMatch(/--radius-md:\s*12px;/);
    expect(globalsCss).toMatch(/--radius-lg:\s*12px;/);
    expect(globalsCss).toMatch(/--radius-pill:\s*9999px;/);

    expect(BUSINESS_TIMELINE.map(item => item.step)).toEqual(['Discover', 'Connect', 'Grow']);
    expect(ADS_STUDIO_PILLARS.every(p => !/^0\d$/.test(p.num))).toBe(true);
  });

  it('guarantees zero purple utilities/gradients, zero "800+" strings, zero stray sparkles outside Astra, and zero "Why VISTRAH?" sections', () => {
    expect(existsSync(join(repoRoot, 'frontend', 'components', 'why-vistrah.tsx'))).toBe(false);
    expect(existsSync(join(repoRoot, 'frontend', 'components', 'why-vistrah.module.css'))).toBe(false);

    const files = [
      ...collectFiles(join(repoRoot, 'shared')),
      ...collectFiles(join(repoRoot, 'frontend')),
      ...collectFiles(join(repoRoot, 'admin')),
    ];

    const purpleClassRe =
      /\b(?:from|via|to)-(?:purple|violet|indigo|fuchsia)(?:-[a-z0-9/]+)?\b|\b(?:text|bg|border|ring|shadow)-(?:purple|violet|indigo|fuchsia)-[0-9]{2,3}\b/i;
    const stale800Re = /800\+/;
    const whyVistrahRe = /Why VISTRAH\?/i;
    const sparkleRe = /✨|\bSparkles\b/;

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const isAstraFile = /ask-vistrah/i.test(file);
      const lines = content.split(/\r?\n/);

      lines.forEach((line, idx) => {
        if (purpleClassRe.test(line)) {
          violations.push(`purple-utility ${file}:${idx + 1}: ${line.trim()}`);
        }
        if (stale800Re.test(line)) {
          violations.push(`stale-800+ ${file}:${idx + 1}: ${line.trim()}`);
        }
        if (whyVistrahRe.test(line)) {
          violations.push(`why-vistrah ${file}:${idx + 1}: ${line.trim()}`);
        }
        if (!isAstraFile && sparkleRe.test(line)) {
          violations.push(`stray-sparkle ${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('eliminates border-l-4 / border-t-4 accent stripes and 01 / 02 / 03 watermark step cards from public user-facing pages', () => {
    const publicFiles = [
      join(repoRoot, 'frontend', 'app', 'globals.css'),
      join(repoRoot, 'frontend', 'app', 'reference-theme.css'),
      ...collectFiles(join(repoRoot, 'frontend', 'app', '(public)')),
      ...collectFiles(join(repoRoot, 'frontend', 'components')),
      ...collectFiles(join(repoRoot, 'admin', 'components')),
    ];

    const stripeRe = /\bborder-(?:l|t)-4\b|border-(?:left|top)\s*:\s*[2-9]px\s+solid/i;
    const stepWatermarkRe =
      /0\$\{index\s*\+\s*1\}|\bSTEP\s+0[1-9]\b|\b0[1-9]\s*\/\s*0[1-9]\b|\bPAID\s+(?:AGENCY|TECH)\s+TRACK\s+0[1-9]\b/;

    const violations: string[] = [];

    for (const file of publicFiles) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (stripeRe.test(line)) {
          violations.push(`accent-stripe ${file}:${idx + 1}: ${line.trim()}`);
        }
        if (stepWatermarkRe.test(line)) {
          violations.push(`step-watermark ${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
