import { PALETTE, YOLK } from '../config';

interface Pixel {
  dx: number;
  dy: number;
  color: string;
  fade: number; // 0–1: when this pixel drops out during the dissolve
}

interface Splat {
  cx: number;
  cy: number;
  age: number;
  pixels: Pixel[];
  drips: { dx: number; dy: number; width: number }[];
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Lumpy cream blob with an orange yolk, like the asteroid generator but splashier.
function makeSplat(): Pick<Splat, 'pixels' | 'drips'> {
  const r = YOLK.radius;
  const slices = 10;
  const edge = Array.from({ length: slices }, () => r * rand(0.7, 1.15));
  const yolk = { x: rand(-3, 3), y: rand(-3, 2) };
  const pixels: Pixel[] = [];
  const bottom: Record<number, number> = {}; // lowest pixel per column, for drips
  for (let dy = -r - 2; dy <= r + 2; dy++) {
    for (let dx = -r - 2; dx <= r + 2; dx++) {
      const d = Math.hypot(dx, dy);
      const slice = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * slices) % slices;
      if (d > edge[slice]) continue;
      const inYolk = Math.hypot(dx - yolk.x, dy - yolk.y) < YOLK.yolkRadius;
      // Edges dissolve first, the yolk last.
      const fade = Math.min(1, (1 - d / r) * 0.6 + Math.random() * 0.5 + (inYolk ? 0.3 : 0));
      pixels.push({ dx, dy, color: inYolk ? PALETTE.detail : PALETTE.rocket, fade });
      bottom[dx] = Math.max(bottom[dx] ?? -Infinity, dy);
    }
  }
  const cols = Object.keys(bottom).map(Number).filter((c) => Math.abs(c) < r * 0.7);
  const drips = Array.from({ length: YOLK.drips }, () => {
    const dx = cols[Math.floor(Math.random() * cols.length)];
    return { dx, dy: bottom[dx], width: Math.random() < 0.4 ? 2 : 1 };
  });
  return { pixels, drips };
}

// Yolk splats from cream eggs: they cover part of the screen, drip, then break up.
export class Yolk {
  private splats: Splat[] = [];

  clear(): void {
    this.splats = [];
  }

  add(): void {
    this.splats.push({ cx: Math.round(rand(YOLK.xMin, YOLK.xMax)), cy: Math.round(rand(YOLK.yMin, YOLK.yMax)), age: 0, ...makeSplat() });
  }

  get active(): boolean {
    return this.splats.length > 0;
  }

  update(dt: number): void {
    for (const s of this.splats) s.age += dt;
    this.splats = this.splats.filter((s) => s.age < YOLK.duration);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const s of this.splats) {
      // 0 while solid, rising to 1 over the fade time at the end.
      const fadeStart = YOLK.duration - YOLK.fadeTime;
      const dissolve = Math.max(0, (s.age - fadeStart) / YOLK.fadeTime);
      for (const p of s.pixels) {
        if (p.fade < dissolve) continue;
        ctx.fillStyle = p.color;
        ctx.fillRect(s.cx + p.dx, s.cy + p.dy, 1, 1);
      }
      if (dissolve > 0.5) continue;
      ctx.fillStyle = PALETTE.rocket;
      const len = Math.floor(s.age * YOLK.dripSpeed);
      for (const d of s.drips) ctx.fillRect(s.cx + d.dx, s.cy + d.dy + 1, d.width, len);
    }
  }
}
