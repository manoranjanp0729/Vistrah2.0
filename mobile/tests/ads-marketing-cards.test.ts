import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

function readImageDimensions(buf: Buffer, filename: string): {width: number; height: number} {
  if (filename.endsWith('.webp')) {
    assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(buf.subarray(8, 12).toString('ascii'), 'WEBP');
    const chunk = buf.subarray(12, 16).toString('ascii');
    if (chunk === 'VP8 ') {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === 'VP8L') {
      const b0 = buf[21]!;
      const b1 = buf[22]!;
      const b2 = buf[23]!;
      const b3 = buf[24]!;
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (chunk === 'VP8X') {
      return {
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    }
    throw new Error(`Unsupported WebP chunk ${chunk} in ${filename}`);
  }
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    assert.equal(buf[0], 0xff);
    assert.equal(buf[1], 0xd8);
    let offset = 2;
    while (offset + 8 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buf[offset + 1]!;
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return {
          height: buf.readUInt16BE(offset + 5),
          width: buf.readUInt16BE(offset + 7),
        };
      }
      const length = buf.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }
  throw new Error(`Could not parse dimensions for ${filename}`);
}

test('mobile Ads & Marketing cards lock a 4:3 landscape frame, compact padding, and full-res assets', () => {
  const adsSource = fs.readFileSync(
    path.join(repoRoot, 'mobile/src/components/ads-marketing.tsx'),
    'utf8'
  );
  assert.doesNotMatch(adsSource, /croppedPhoto/);
  assert.doesNotMatch(adsSource, /aspectRatio:\s*16\s*\/\s*9/);
  assert.doesNotMatch(adsSource, /aspectRatio:\s*3\s*\/\s*4/);
  assert.match(adsSource, /aspectRatio:\s*4\s*\/\s*3/);
  assert.match(adsSource, /resizeMode="cover"/);
  assert.match(adsSource, /position:\s*'absolute',\s*top:\s*0,\s*left:\s*0,\s*width:\s*'100%',\s*height:\s*'100%'/);
  assert.match(adsSource, /padding:\s*12/);
  assert.match(adsSource, /numberOfLines=\{2\}/);
  assert.match(adsSource, /fontSize:\s*15,\s*lineHeight:\s*20/);
});

test('mobile PhotoCard and service category grids enforce 4:3 landscape frames without downscaled thumbnails', () => {
  const photoCardSource = fs.readFileSync(
    path.join(repoRoot, 'mobile/src/components/photo-card.tsx'),
    'utf8'
  );
  assert.doesNotMatch(photoCardSource, /croppedPhoto/);
  assert.doesNotMatch(photoCardSource, /aspectRatio:\s*16\s*\/\s*9/);
  assert.match(photoCardSource, /aspectRatio:\s*4\s*\/\s*3/);

  const servicesSource = fs.readFileSync(
    path.join(repoRoot, 'mobile/src/app/services/index.tsx'),
    'utf8'
  );
  assert.match(servicesSource, /flowGridPhoto:\{[^}]*aspectRatio:\s*4\s*\/\s*3/);
  assert.match(servicesSource, /flowGridCard:\{[^}]*padding:\s*12/);
});

test('all self-hosted Ads & Marketing card assets are synced across web & mobile at >= 800px 4:3 resolution', () => {
  const sharedMarketingSource = fs.readFileSync(
    path.join(repoRoot, 'shared/marketing-services.ts'),
    'utf8'
  );
  const servicePhotos = Array.from(
    sharedMarketingSource.matchAll(/photo:\s*'([^']+)'/g),
    (match) => match[1]!
  );
  assert.equal(servicePhotos.length, 4);
  const filenames = [...servicePhotos, 'social-media-management.webp'];
  for (const filename of filenames) {
    const mobileAsset = path.join(repoRoot, 'mobile/assets/ads-marketing', filename);
    const webAsset = path.join(repoRoot, 'frontend/public/images/ads-marketing', filename);
    assert.ok(fs.existsSync(mobileAsset), `Missing mobile asset ${filename}`);
    assert.ok(fs.existsSync(webAsset), `Missing web asset ${filename}`);
    const mobileBuf = fs.readFileSync(mobileAsset);
    const webBuf = fs.readFileSync(webAsset);
    assert.equal(
      Buffer.compare(mobileBuf, webBuf),
      0,
      `Web and mobile copies differ for ${filename}`
    );
    const dims = readImageDimensions(mobileBuf, filename);
    assert.ok(
      dims.width >= 800,
      `Expected ${filename} width >= 800px, got ${dims.width}x${dims.height}`
    );
    assert.equal(
      Number((dims.width / dims.height).toFixed(2)),
      1.33,
      `Expected ${filename} to have 4:3 aspect ratio, got ${dims.width}x${dims.height}`
    );
  }
});
