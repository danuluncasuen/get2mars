import { PALETTE, type PowerKind } from './config';

// A sprite is rows of characters; '.' is transparent and other letters map to palette colors.
export type SpriteMap = readonly string[];
export type ColorKey = Record<string, string>;

export const ROCKET_MAP: SpriteMap = [
  '....R....',
  '...RRR...',
  '...RRR...',
  '..RRRRR..',
  '..RDDDR..',
  '..RDDDR..',
  '..RRRRR..',
  '..RRRRR..',
  '.RRRRRRR.',
  'RRRRRRRRR',
  'RR.RRR.RR',
  'R.......R',
];

export const ROCKET_COLORS: ColorKey = { R: PALETTE.rocket, D: PALETTE.detail };

// Pre-renders a map into its own canvas so drawing it is a single drawImage call.
export function makeSprite(map: SpriteMap, colors: ColorKey, flip = false): HTMLCanvasElement {
  const w = map[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = map.length;
  const ctx = canvas.getContext('2d')!;
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = colors[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    });
  });
  return canvas;
}

// A chunky "!": thick bar tapering to a point, gap, square dot.
export const WARNING_MAP: SpriteMap = ['XXX', 'XXX', 'XXX', 'XXX', 'XXX', '.X.', '...', 'XXX', 'XXX'];

export const DETAIL_COLORS: ColorKey = { X: PALETTE.detail };

// Builds a lumpy, cratered asteroid. The same seed always gives the same rock.
export function makeAsteroid(r: number, seed: number): HTMLCanvasElement {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const slices = 12;
  const jitter = Array.from({ length: slices }, () => rand() * 2.4 - 1.2);
  const craters = Array.from({ length: 4 }, () => ({
    x: (rand() - 0.5) * r * 1.1,
    y: (rand() - 0.5) * r * 1.1,
    r: 1.5 + rand() * r * 0.22,
  }));

  const size = r * 2 + 3;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      const slice = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * slices) % slices;
      const edge = r + jitter[slice];
      if (d > edge) continue;
      let color: string = PALETTE.detail;
      if (craters.some((k) => Math.hypot(dx - k.x, dy - k.y) < k.r)) color = PALETTE.bg;
      else if (d > edge - 1.2 && dx < 0 && dy < 0) color = PALETTE.rocket; // rim light, top-left
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Chickens face right; flip for left-flying ones. B = body, O = beak/comb/feet, E = eye.
export const CHICKEN_A: SpriteMap = [
  '....BB.....',
  '...BBB.....',
  '..BBB...OO.',
  'BBBBBBBBBB.',
  '.BBBBBBBEBO',
  '..BBBBBBBB.',
  '...BBBBBB..',
  '....O..O...',
  '...........',
];

export const CHICKEN_B: SpriteMap = [
  '...........',
  '...........',
  '........OO.',
  'BBBBBBBBBB.',
  '.BBBBBBBEBO',
  '..BBBBBBBB.',
  '...BBBBBB..',
  '...BBBB....',
  '....O..O...',
];

export const CHICKEN_COLORS: ColorKey = { B: PALETTE.rocket, O: PALETTE.detail, E: PALETTE.bg };

export const EGG_FULL: SpriteMap = ['.XX.', 'XXXX', 'XXXX', 'XXXX', '.XX.'];
export const EGG_EMPTY: SpriteMap = ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'];

export const SWAP_MAP: SpriteMap = ['....X..', 'XXXXXX.', '....X..', '..X....', '.XXXXXX', '..X....'];

// Speaker for the mute toggle; the muted version swaps the waves for an X.
export const SPEAKER_MAP: SpriteMap = [
  '..X....',
  '.XX..X.',
  'XXX.X.X',
  'XXX.X.X',
  'XXX.X.X',
  '.XX..X.',
  '..X....',
];
export const SPEAKER_MUTED_MAP: SpriteMap = [
  '..X....',
  '.XX....',
  'XXX.X.X',
  'XXX..X.',
  'XXX.X.X',
  '.XX....',
  '..X....',
];

// Power-up pickups: B = box, G = glyph. The two colors swap every few frames.
const BOX_TOP = 'BBBBBBBBB';
const BOX_GAP = 'B.......B';
export const PICKUP_MAPS: Record<PowerKind, SpriteMap> = {
  shield: [BOX_TOP, BOX_GAP, 'B.GGGGG.B', 'B.GGGGG.B', 'B.GGGGG.B', 'B..GGG..B', 'B...G...B', BOX_GAP, BOX_TOP],
  slow: [BOX_TOP, BOX_GAP, 'B.GGGGG.B', 'B..GGG..B', 'B...G...B', 'B..GGG..B', 'B.GGGGG.B', BOX_GAP, BOX_TOP],
  eggs: [BOX_TOP, BOX_GAP, 'B...G...B', 'B..GGG..B', 'B.GGGGG.B', 'B.GGGGG.B', 'B..GGG..B', BOX_GAP, BOX_TOP],
};
