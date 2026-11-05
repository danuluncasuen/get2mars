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

// Every sprite canvas made, so they can all be drawn once at startup (see warmUp in main.ts).
export const ALL_SPRITES: HTMLCanvasElement[] = [];

export function registerSprite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  ALL_SPRITES.push(canvas);
  return canvas;
}

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
  return registerSprite(canvas);
}

// A chunky "!": thick bar tapering to a point, gap, square dot.
export const WARNING_MAP: SpriteMap = ['XXX', 'XXX', 'XXX', 'XXX', 'XXX', '.X.', '...', 'XXX', 'XXX'];

export const DETAIL_COLORS: ColorKey = { X: PALETTE.detail };

// Adds a 1 px 'N' border around every X in a map (the map grows by 1 px on each side).
function outline(map: SpriteMap): SpriteMap {
  const h = map.length + 2;
  const w = map[0].length + 2;
  const at = (x: number, y: number) => map[y - 1]?.[x - 1] === 'X';
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (at(x, y)) return 'X';
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) return 'N';
      return '.';
    }).join(''),
  );
}

// The "!" for incoming asteroids and comets, outlined in navy so it stands out over Mars,
// yolk or anything else orange behind it. 5 x 11 including the outline.
export function makeWarning(): HTMLCanvasElement {
  return makeSprite(outline(WARNING_MAP), { X: PALETTE.detail, N: PALETTE.bg });
}

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
  return registerSprite(canvas);
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

// HUD lives: a full heart, and the outline left when one is lost.
export const HEART_FULL: SpriteMap = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
export const HEART_EMPTY: SpriteMap = ['.X.X.', 'X.X.X', 'X...X', '.X.X.', '..X..'];


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

// Power-up pickups: B = box, G = glyph (see pickup.ts for the colors).
const BOX_TOP = 'BBBBBBBBB';
const BOX_GAP = 'B.......B';
export const PICKUP_MAPS: Record<PowerKind, SpriteMap> = {
  shield: [BOX_TOP, BOX_GAP, 'B.GGGGG.B', 'B.GGGGG.B', 'B.GGGGG.B', 'B..GGG..B', 'B...G...B', BOX_GAP, BOX_TOP],
  time: [BOX_TOP, BOX_GAP, 'B..GGG..B', 'B.G.G.G.B', 'B.G.GGG.B', 'B.G...G.B', 'B..GGG..B', BOX_GAP, BOX_TOP],
  eggs: [BOX_TOP, BOX_GAP, 'B...G...B', 'B..GGG..B', 'B.GGGGG.B', 'B.GGGGG.B', 'B..GGG..B', BOX_GAP, BOX_TOP],
};

// HUD icon while dazed (slowed by a chicken).
export const FEATHER_MAP: SpriteMap = ['.....XX', '....XXX', '...XXX.', '..XXX..', '.XX....', 'X......'];

// Collectible star; it twinkles down to its center pixel now and then.
export const STAR_MAP: SpriteMap = ['.X.', 'XXX', '.X.'];

// Falling egg from a late chicken.
export const FALLING_EGG_MAP: SpriteMap = ['.XX.', 'XXXX', 'XXXX', 'XXXX', '.XX.'];
