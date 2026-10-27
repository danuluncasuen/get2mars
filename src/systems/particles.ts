import { PARTICLES } from '../config';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Single-pixel particles in palette colors, pulled down by gravity.
export class Particles {
  private list: Particle[] = [];

  add(x: number, y: number, vx: number, vy: number, life: number, color: string): void {
    if (this.list.length >= PARTICLES.max) return;
    this.list.push({ x, y, vx, vy, life, color });
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.vy += PARTICLES.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
    }
  }
}
