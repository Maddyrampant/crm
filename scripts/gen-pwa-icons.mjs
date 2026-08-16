import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PRIMARY = [0x73, 0x67, 0xf0];
const PRIMARY_LIGHT = [0x8f, 0x85, 0xf3];

const BOLT = [
  [488.4, 219.6],
  [256, 35.6],
  [207.8, 219.6],
  [64, 219.6],
  [209.7, 343.9],
  [123.2, 480],
  [256, 320.8],
  [388.8, 480],
  [302.3, 343.9],
  [448, 219.6],
];

function inRoundedRect(x, y, size, radius) {
  const r = radius;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function render(size) {
  const s = 0.86;
  const offset = (1 - s) / 2;
  const radius = size * 0.22;
  const px = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = y / (size - 1);
      let r = Math.round(PRIMARY[0] + (PRIMARY_LIGHT[0] - PRIMARY[0]) * t);
      let g = Math.round(PRIMARY[1] + (PRIMARY_LIGHT[1] - PRIMARY[1]) * t);
      let b = Math.round(PRIMARY[2] + (PRIMARY_LIGHT[2] - PRIMARY[2]) * t);

      if (inRoundedRect(x + 0.5, y + 0.5, size, radius)) {
        const bx = ((x + 0.5) / size - offset) / s;
        const by = ((y + 0.5) / size - offset) / s;
        if (bx > 0 && bx < 1 && by > 0 && by < 1 && inPolygon(bx * 512, by * 512, BOLT)) {
          r = g = b = 255;
        }
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
        px[i + 3] = 255;
      }
    }
  }
  return px;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePng(path, size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  writeFileSync(
    path,
    Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
  );
}

const outputs = [
  ["src/app/icon.png", 512],
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
];

for (const [rel, size] of outputs) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writePng(path, size, render(size));
  console.log(`wrote ${rel} (${size}x${size})`);
}
