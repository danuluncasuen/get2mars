import { MARS, PALETTE } from '../config';

// Craters as [x, y, radius], in fractions of the planet's radius.
const CRATERS = [
  [-0.45, 0.35, 0.22],
  [-0.1, 0.6, 0.14],
  [-0.6, -0.05, 0.12],
  [0.15, 0.25, 0.1],
];

// Renders Mars at radius r into its own canvas, centered.
function makeMars(r: number): HTMLCanvasElement {
  const size = r * 2 + 2;
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
      if (d > r) continue;
      // The checker is anchored to the screen grid (the planet's offset is even), so it never shimmers.
      const checker = (x + y) % 2 === 0;
      // Lit rim on the edge facing into the screen (bottom-left), dithered cream.
      if (d > r - 1.5 && dx < 0 && dy > 0) {
        if (checker) {
          ctx.fillStyle = PALETTE.rocket;
          ctx.fillRect(x, y, 1, 1);
        }
        continue;
      }
      // Craters are thinner patches of dither: one pixel in four instead of one in two.
      const inCrater = CRATERS.some(([kx, ky, kr]) => Math.hypot(dx / r - kx, dy / r - ky) < kr);
      const on = inCrater ? x % 2 === 0 && y % 2 === 0 : checker;
      if (!on) continue;
      ctx.fillStyle = PALETTE.detail;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// Dithered Mars in the top-right corner, growing with the run's time up to a size cap.
export class Mars {
  private radius = -1;
  private sprite: HTMLCanvasElement | null = null;

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const k = Math.min(1, time / MARS.reachTime);
    const r = Math.round(MARS.radiusStart + (MARS.radiusMax - MARS.radiusStart) * k);
    if (r !== this.radius) {
      this.radius = r;
      this.sprite = makeMars(r);
    }
    const half = this.sprite!.width / 2;
    // Even offsets keep the checker lined up with the screen's pixel grid as it grows.
    const x = Math.round((MARS.cx - half) / 2) * 2;
    const y = Math.round((MARS.cy - half) / 2) * 2;
    ctx.drawImage(this.sprite!, x, y);
  }
}
