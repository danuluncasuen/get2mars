import { PALETTE, STARS, VIEW } from '../config';

interface Star {
  x: number;
  y: number;
  speed: number;
}

// Two parallax layers of single orange pixels that wrap vertically.
export class Starfield {
  private readonly stars: Star[] = [];

  constructor() {
    for (let i = 0; i < STARS.count; i++) {
      this.stars.push({
        x: Math.floor(Math.random() * VIEW.w),
        y: Math.random() * VIEW.h,
        speed: Math.random() < STARS.nearShare ? STARS.nearSpeed : STARS.farSpeed,
      });
    }
  }

  update(dt: number, speedFactor = 1): void {
    for (const s of this.stars) {
      s.y += s.speed * speedFactor * dt;
      if (s.y >= VIEW.h) s.y -= VIEW.h;
    }
  }

  render(ctx: CanvasRenderingContext2D, frame: number): void {
    ctx.fillStyle = PALETTE.detail;
    const phase = Math.floor(frame / STARS.blinkFrames);
    this.stars.forEach((s, i) => {
      if ((i + phase) % STARS.blinkEvery === 0) return;
      ctx.fillRect(s.x, Math.floor(s.y), 1, 1);
    });
  }
}
