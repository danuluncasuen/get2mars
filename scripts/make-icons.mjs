// Renders the home-screen icons from the rocket pixel map in src/sprites.ts.
// Run with `npm run icons`; writes PNGs to public/icons/.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const NAVY = [0x1b, 0x1f, 0x3b];
const CREAM = [0xf2, 0xe9, 0xdc];
const ORANGE = [0xff, 0x6b, 0x35];

// Pull ROCKET_MAP out of sprites.ts so the icon never drifts from the game sprite.
const src = readFileSync(new URL('../src/sprites.ts', import.meta.url), 'utf8');
const block = src.match(/ROCKET_MAP[^=]*=\s*\[([\s\S]*?)\];/)[1];
const rocket = [...block.matchAll(/'([^']*)'/g)].map((m) => m[1]);
// Long flame under the nozzle, as drawn in game (3 wide x 4, then 1 wide x 2).
const art = [...rocket, '...FFF...', '...FFF...', '...FFF...', '...FFF...', '....F....', '....F....'];
const colors = { R: CREAM, D: ORANGE, F: ORANGE };
// Four stars, in art-pixel units relative to the rocket's top-left.
const stars = [[-5, 1], [12, -2], [-4, 13], [13, 11]];

function icon(size, fill) {
  const px = Math.floor((size * fill) / art.length); // integer pixel scale keeps it crisp
  const ox = Math.floor((size - art[0].length * px) / 2);
  const oy = Math.floor((size - art.length * px) / 2);
  const rgb = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) rgb.set(NAVY, i * 3);
  const plot = (ax, ay, color) => {
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        const X = ox + ax * px + x;
        const Y = oy + ay * px + y;
        if (X >= 0 && Y >= 0 && X < size && Y < size) rgb.set(color, (Y * size + X) * 3);
      }
  };
  art.forEach((row, y) => [...row].forEach((ch, x) => colors[ch] && plot(x, y, colors[ch])));
  for (const [x, y] of stars) plot(x, y, ORANGE);
  return png(size, rgb);
}

function png(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

const out = new URL('../public/icons/', import.meta.url);
// Maskable icons get cropped to a circle, so the art stays inside the middle 60%.
for (const [name, size, fill] of [
  ['apple-touch-icon.png', 180, 0.6],
  ['icon-192.png', 192, 0.6],
  ['icon-512.png', 512, 0.6],
  ['icon-maskable-512.png', 512, 0.5],
]) {
  writeFileSync(new URL(name, out), icon(size, fill));
  console.log('wrote', name);
}
