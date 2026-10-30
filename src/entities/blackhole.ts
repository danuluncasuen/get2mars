import { BLACK_HOLE, PALETTE } from '../config';
import type { Box } from './rocket';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// A filled pixel disc.
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
  }
}

// Opens, pulls on the rocket for a while, then closes. Size and pull follow `strength`.
export class BlackHole {
  dead = false;
  private age = 0;
  private closing = -1; // s into an early close, or -1
  private readonly specks = Array.from({ length: BLACK_HOLE.specks }, (_, i) => ({
    angle: (i / BLACK_HOLE.specks) * Math.PI * 2,
    r: rand(4, BLACK_HOLE.speckRadius),
  }));

  constructor(
    readonly cx: number,
    readonly cy: number,
  ) {}

  // 0–1: grows while opening, 1 while open, shrinks while closing.
  get strength(): number {
    const { openTime, lifeTime, closeTime } = BLACK_HOLE;
    if (this.closing >= 0) return Math.max(0, 1 - this.closing / closeTime);
    if (this.age < openTime) return this.age / openTime;
    return Math.min(1, Math.max(0, 1 - (this.age - openTime - lifeTime) / closeTime));
  }

  // Only a fully open hole swallows things.
  get open(): boolean {
    return this.closing < 0 && this.age >= BLACK_HOLE.openTime && this.strength > 0.5;
  }

  // Collapses early, e.g. when a shield hits it.
  collapse(): void {
    if (this.closing < 0) this.closing = 0;
  }

  coreHits(b: Box): boolean {
    const nx = Math.max(b.x, Math.min(this.cx, b.x + b.w));
    const ny = Math.max(b.y, Math.min(this.cy, b.y + b.h));
    return Math.hypot(nx - this.cx, ny - this.cy) < BLACK_HOLE.coreRadius;
  }

  // 0 outside the danger zone, rising to 1 at the core's edge; only while open.
  danger(x: number, y: number): number {
    if (!this.open) return 0;
    const d = Math.hypot(this.cx - x, this.cy - y);
    const { coreRadius, dangerRange } = BLACK_HOLE;
    return Math.max(0, Math.min(1, 1 - (d - coreRadius) / (dangerRange - coreRadius)));
  }

  // Pull on a tumbling chicken at (x, y): acceleration toward the center (px/s²) and drag (per s).
  chickenPull(x: number, y: number): { x: number; y: number; drag: number } {
    const dx = this.cx - x;
    const dy = this.cy - y;
    const d = Math.hypot(dx, dy) || 1;
    if (!this.open || d >= BLACK_HOLE.range) return { x: 0, y: 0, drag: 0 };
    const k = 1 - d / BLACK_HOLE.range;
    const a = BLACK_HOLE.chickenPull * k;
    return { x: (dx / d) * a, y: (dy / d) * a, drag: BLACK_HOLE.chickenDrag * k };
  }

  swallows(x: number, y: number): boolean {
    return this.open && Math.hypot(this.cx - x, this.cy - y) < BLACK_HOLE.swallowRadius;
  }

  // Px offset toward the hole for something centered at (x, y): stronger the closer it is.
  pullOn(x: number, y: number): { x: number; y: number } {
    const dx = this.cx - x;
    const dy = this.cy - y;
    const d = Math.hypot(dx, dy) || 1;
    if (d >= BLACK_HOLE.range) return { x: 0, y: 0 };
    const k = BLACK_HOLE.maxPull * Math.pow(1 - d / BLACK_HOLE.range, 1.5) * this.strength;
    return { x: (dx / d) * k, y: (dy / d) * k };
  }

  update(dt: number): void {
    this.age += dt;
    if (this.closing >= 0) this.closing += dt;
    const s = this.strength;
    for (const p of this.specks) {
      p.angle += (BLACK_HOLE.diskSpin + 24 / p.r) * dt;
      p.r -= 10 * dt;
      if (p.r < 2) p.r = BLACK_HOLE.speckRadius * rand(0.7, 1);
    }
    if (s <= 0 && this.age > BLACK_HOLE.openTime) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.strength;
    if (s <= 0) return;
    const spin = this.age * BLACK_HOLE.diskSpin;
    const rx = BLACK_HOLE.diskRx * s;
    const ry = BLACK_HOLE.diskRy * s;
    // Disk dots: the back half goes behind the core, the front half over it.
    const dots = (front: boolean) => {
      for (let i = 0; i < BLACK_HOLE.diskDots; i++) {
        const a = spin + (i * Math.PI * 2) / BLACK_HOLE.diskDots;
        if (Math.sin(a) > 0 !== front) continue;
        ctx.fillStyle = i % 3 ? PALETTE.detail : PALETTE.rocket;
        ctx.fillRect(Math.round(this.cx + Math.cos(a) * rx), Math.round(this.cy + Math.sin(a) * ry), 1, 1);
      }
    };
    ctx.fillStyle = PALETTE.rocket;
    for (const p of this.specks) {
      const r = p.r * s;
      ctx.fillRect(Math.round(this.cx + Math.cos(p.angle) * r), Math.round(this.cy + Math.sin(p.angle) * r * 0.6), 1, 1);
    }
    dots(false);
    // Orange rim, then the navy core inside it.
    const core = Math.round(BLACK_HOLE.coreRadius * s);
    ctx.fillStyle = PALETTE.detail;
    disc(ctx, this.cx, this.cy, core + 1);
    ctx.fillStyle = PALETTE.bg;
    disc(ctx, this.cx, this.cy, core);
    dots(true);
  }
}
