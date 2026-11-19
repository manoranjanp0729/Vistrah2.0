/**
 * Pure TypeScript ISO/IEC 18004 QR Code Byte-Mode Matrix Generator (Versions 1..10, ECC Level L).
 * Zero external dependencies and zero network requests — produces genuine scannable QR matrices
 * for SVG & React Native rendering across web, admin, print PDF, and mobile.
 */

// Total codewords and ECC codewords per single block for Versions 1..10 at Error Correction Level L:
// [version]: [totalDataCodewords, ecCodewordsPerBlock, numBlocks]
const VERSION_L_SPECS: Readonly<Record<number, readonly [number, number, number]>> = {
  1: [19, 7, 1],
  2: [34, 10, 1],
  3: [55, 15, 1],
  4: [80, 20, 1],
  5: [108, 26, 1],
  6: [136, 18, 2],
  7: [156, 20, 2],
  8: [194, 24, 2],
  9: [232, 30, 2],
  10: [274, 18, 4],
};

const ALIGNMENT_CENTERS: Readonly<Record<number, readonly number[]>> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) {
      rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

function chooseVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) {
    const [dataCap] = VERSION_L_SPECS[v];
    // 4-bit mode + (8 or 16)-bit length + payload + up to 4 terminator bits -> header overhead 2 or 3 bytes
    const headerBytes = v <= 9 ? 2 : 3;
    if (byteLen + headerBytes <= dataCap) return v;
  }
  return 10;
}

function encodeCodewords(bytes: Uint8Array, version: number): Uint8Array {
  const [totalDataCw, ecCwPerBlock, numBlocks] = VERSION_L_SPECS[version];
  const countBits = version <= 9 ? 8 : 16;
  const maxPayload = totalDataCw - (version <= 9 ? 2 : 3);
  const payload = bytes.length > maxPayload ? bytes.slice(0, maxPayload) : bytes;

  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator = 0100
  pushBits(0b0100, 4);
  pushBits(payload.length, countBits);
  for (let i = 0; i < payload.length; i++) {
    pushBits(payload[i], 8);
  }

  const maxBits = totalDataCw * 8;
  const term = Math.min(4, maxBits - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords = new Uint8Array(totalDataCw);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataCodewords[i] = byte;
  }

  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < totalDataCw; i++, p ^= 1) {
    dataCodewords[i] = padBytes[p];
  }

  // Split into blocks (for v10: 2 blocks of 68 + 2 blocks of 69 = 274)
  const baseBlockLen = Math.floor(totalDataCw / numBlocks);
  const extraBlocks = totalDataCw % numBlocks;
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const len = baseBlockLen + (b >= numBlocks - extraBlocks ? 1 : 0);
    const block = dataCodewords.slice(offset, offset + len);
    offset += len;
    dataBlocks.push(block);
    ecBlocks.push(rsComputeRemainder(block, ecCwPerBlock));
  }

  // Interleave data codewords then ECC codewords
  const out: number[] = [];
  const maxBlockLen = baseBlockLen + (extraBlocks > 0 ? 1 : 0);
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) out.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < ecCwPerBlock; i++) {
    for (let b = 0; b < numBlocks; b++) {
      out.push(ecBlocks[b][i]);
    }
  }
  return new Uint8Array(out);
}

function setFinderPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  top: number,
  left: number,
) {
  const size = modules.length;
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const r = top + dy;
      const c = left + dx;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const inOuter = dy >= 0 && dy <= 6 && dx >= 0 && dx <= 6;
      const onBorder = dy === 0 || dy === 6 || dx === 0 || dx === 6;
      const inCenter = dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4;
      modules[r][c] = inOuter && (onBorder || inCenter);
      isFunction[r][c] = true;
    }
  }
}

function setAlignmentPattern(
  modules: boolean[][],
  isFunction: boolean[][],
  centerR: number,
  centerC: number,
) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const dist = Math.max(Math.abs(dy), Math.abs(dx));
      modules[centerR + dy][centerC + dx] = dist !== 1;
      isFunction[centerR + dy][centerC + dx] = true;
    }
  }
}

function drawFormatBits(
  modules: boolean[][],
  isFunction: boolean[][],
  mask: number,
) {
  // ECC Level L = 01
  const data = (0b01 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) {
    rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;
  const getBit = (i: number) => ((bits >>> i) & 1) !== 0;

  const size = modules.length;
  for (let i = 0; i <= 5; i++) {
    modules[8][i] = getBit(i);
    isFunction[8][i] = true;
  }
  modules[8][7] = getBit(6);
  isFunction[8][7] = true;
  modules[8][8] = getBit(7);
  isFunction[8][8] = true;
  modules[7][8] = getBit(8);
  isFunction[7][8] = true;
  for (let i = 9; i < 15; i++) {
    modules[14 - i][8] = getBit(i);
    isFunction[14 - i][8] = true;
  }

  for (let i = 0; i < 8; i++) {
    modules[8][size - 1 - i] = getBit(i);
    isFunction[8][size - 1 - i] = true;
  }
  for (let i = 8; i < 15; i++) {
    modules[size - 15 + i][8] = getBit(i);
    isFunction[size - 15 + i][8] = true;
  }
  modules[size - 8][8] = true;
  isFunction[size - 8][8] = true;
}

export function encodeQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text.trim() || 'https://vistrah.in');
  const version = chooseVersion(bytes.length);
  const size = version * 4 + 17;

  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  // Finder patterns + separators
  setFinderPattern(modules, isFunction, 0, 0);
  setFinderPattern(modules, isFunction, 0, size - 7);
  setFinderPattern(modules, isFunction, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    modules[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  // Alignment patterns
  const centers = ALIGNMENT_CENTERS[version];
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === centers.length - 1) ||
        (i === centers.length - 1 && j === 0)
      ) {
        continue;
      }
      setAlignmentPattern(modules, isFunction, centers[i], centers[j]);
    }
  }

  // Reserve format info slots before placing data bits
  drawFormatBits(modules, isFunction, 0);

  // Place data + ECC bits in standard upward/downward 2-column zigzag
  const codewords = encodeCodewords(bytes, version);
  let bitIdx = 0;
  const totalBits = codewords.length * 8;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (!isFunction[r][c] && bitIdx < totalBits) {
          const byte = codewords[bitIdx >>> 3];
          const bit = ((byte >>> (7 - (bitIdx & 7))) & 1) !== 0;
          modules[r][c] = bit;
          bitIdx++;
        }
      }
    }
  }

  // Apply Mask 0: (r + c) % 2 === 0 on non-function modules and write final format bits
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        modules[r][c] = !modules[r][c];
      }
    }
  }
  drawFormatBits(modules, isFunction, 0);

  return modules;
}

export function qrMatrixToSvgPath(matrix: readonly (readonly boolean[])[], quietZone = 2): {
  viewBoxSize: number;
  pathD: string;
} {
  const n = matrix.length;
  const viewBoxSize = n + quietZone * 2;
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        parts.push(`M${c + quietZone} ${r + quietZone}h1v1h-1z`);
      }
    }
  }
  return {
    viewBoxSize,
    pathD: parts.join(''),
  };
}

export function buildQrStandeeSvgMarkup(params: {
  businessName: string;
  sectorTitle: string;
  targetUrl: string;
}): string {
  const matrix = encodeQrMatrix(params.targetUrl);
  const { viewBoxSize, pathD } = qrMatrixToSvgPath(matrix, 2);
  const safeBiz = params.businessName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 42);
  const safeSector = params.sectorTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 48);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="540" viewBox="0 0 420 540">
  <rect width="420" height="540" rx="24" fill="#0f172a"/>
  <rect x="12" y="12" width="396" height="516" rx="18" fill="none" stroke="#d4af37" stroke-width="2"/>
  <text x="210" y="54" text-anchor="middle" fill="#d4af37" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="2">VISTRAH VERIFIED PARTNER</text>
  <text x="210" y="88" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800">${safeBiz}</text>
  <text x="210" y="114" text-anchor="middle" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="12.5" font-weight="600">${safeSector}</text>
  <rect x="75" y="140" width="270" height="270" rx="16" fill="#ffffff"/>
  <svg x="90" y="155" width="240" height="240" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">
    <path d="${pathD}" fill="#0f172a"/>
  </svg>
  <text x="210" y="446" text-anchor="middle" fill="#fde68a" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700">Scan to View Offers, V Ads &amp; Direct Call</text>
  <text x="210" y="474" text-anchor="middle" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="11.5">vistrah.in · Direct Verified Business Network</text>
</svg>`;
}
