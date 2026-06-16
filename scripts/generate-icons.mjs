// Generates the extension icons from code (no design tooling required) so they
// can be regenerated deterministically. Draws the Perfext brand mark — a white
// rounded square (the popup's ".dot") on a dark rounded tile — at every size
// WXT auto-discovers. Output: apps/extension/public/icon/{16,32,48,96,128}.png
//
// Run with: pnpm icons
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SIZES = [16, 32, 48, 96, 128];
const SS = 4; // supersample factor for smooth rounded corners

// Brand colors (mirror apps/extension/entrypoints/popup/style.css).
const TILE = [10, 10, 10]; // --bg  #0a0a0a
const MARK = [250, 250, 250]; // --text #fafafa

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps", "extension", "public", "icon");

/** Signed-distance coverage of a rounded rectangle, 1 inside → 0 outside. */
function roundedRectCoverage(x, y, w, h, r) {
  const dx = Math.max(Math.abs(x - w / 2) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - h / 2) - (h / 2 - r), 0);
  const dist = Math.hypot(dx, dy) - r;
  // 1px-ish smoothstep edge.
  return Math.min(Math.max(0.5 - dist, 0), 1);
}

function renderRGBA(size) {
  const S = size * SS;
  const buf = new Uint8ClampedArray(S * S * 4);
  const tileR = S * 0.22; // tile corner radius
  const markSize = S * 0.5; // centered white square side
  const markR = markSize * 0.28;
  const markOff = (S - markSize) / 2;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      const tileA = roundedRectCoverage(px, py, S, S, tileR);
      const markA = roundedRectCoverage(
        px - markOff,
        py - markOff,
        markSize,
        markSize,
        markR,
      );

      // Composite mark over tile over transparent.
      const r = MARK[0] * markA + TILE[0] * (1 - markA);
      const g = MARK[1] * markA + TILE[1] * (1 - markA);
      const b = MARK[2] * markA + TILE[2] * (1 - markA);
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = tileA * 255;
    }
  }
  return downsample(buf, S, SS);
}

/** Box-average downsample S×S RGBA → (S/ss)×(S/ss). */
function downsample(src, S, ss) {
  const N = S / ss;
  const out = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let yy = 0; yy < ss; yy++) {
        for (let xx = 0; xx < ss; xx++) {
          const si = ((y * ss + yy) * S + (x * ss + xx)) * 4;
          r += src[si]; g += src[si + 1]; b += src[si + 2]; a += src[si + 3];
        }
      }
      const n = ss * ss;
      const oi = (y * N + x) * 4;
      out[oi] = r / n; out[oi + 1] = g / n; out[oi + 2] = b / n; out[oi + 3] = a / n;
    }
  }
  return out;
}

// --- Minimal PNG encoder (RGBA, no external deps) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression, filter, interlace = 0

  // Filter byte 0 per scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  const rgba = renderRGBA(size);
  writeFileSync(join(outDir, `${size}.png`), encodePNG(rgba, size));
  console.log(`✔ icon/${size}.png`);
}
console.log("Done. Icons written to apps/extension/public/icon/");
