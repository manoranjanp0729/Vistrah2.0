import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isPurpleRgb(r: number, g: number, b: number): boolean {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return false;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  const deg = (h / 6) * 360;
  return deg >= 235 && deg <= 335 && s >= 0.1 && l >= 0.04 && l <= 0.98;
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  const skipDirs = new Set(['node_modules', '.next', '.expo', 'dist', 'build', 'tests']);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) collectSourceFiles(join(dir, entry.name), out);
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

test('mobile/src and shared strictly follow VISTRAH Navy + Orange brand palette with zero purple tokens or hex/rgba shades', () => {
  const repoRoot = resolve(__dirname, '../..');
  const files = [
    ...collectSourceFiles(join(repoRoot, 'mobile', 'src')),
    ...collectSourceFiles(join(repoRoot, 'shared')),
  ];

  const hexRe = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const rgbRe = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
  const hslRe = /hsla?\(\s*(\d{1,3}(?:\.\d+)?)/g;
  const twRe = /\b(?:purple|violet|indigo|fuchsia|orchid|lavender)(?:-[a-z0-9/]+)?\b/gi;
  const violations: string[] = [];

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(hexRe)) {
        const raw = m[1];
        const hx = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
        const r = parseInt(hx.slice(0, 2), 16);
        const g = parseInt(hx.slice(2, 4), 16);
        const b = parseInt(hx.slice(4, 6), 16);
        if (isPurpleRgb(r, g, b)) violations.push(`${file}:${idx + 1} hex #${raw}`);
      }
      for (const m of line.matchAll(rgbRe)) {
        if (isPurpleRgb(Number(m[1]), Number(m[2]), Number(m[3]))) {
          violations.push(`${file}:${idx + 1} ${m[0]}`);
        }
      }
      for (const m of line.matchAll(hslRe)) {
        const deg = Number(m[1]);
        if (deg >= 235 && deg <= 335) violations.push(`${file}:${idx + 1} ${m[0]}`);
      }
      for (const m of line.matchAll(twRe)) {
        violations.push(`${file}:${idx + 1} token ${m[0]}`);
      }
    });
  }

  assert.deepEqual(violations, []);
});
