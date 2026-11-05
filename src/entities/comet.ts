import { ASTEROID, COMET, HUD, PALETTE, VIEW } from '../config';
import { snap } from '../pixel';
import { makeWarning } from '../sprites';

// The same "!" asteroids use, so every incoming threat reads the same way.
const WARNING = makeWarning();

// Warns at the left or right edge, then streaks across, aimed where the rocket was.
export class Comet {
  phase: 'warning' | 'flying' = 'warning';
  dead = false;
  grazed = false; // came within the near-miss margin
  nearMissed = false; // bonus already paid
  x: number;
  y: number;
  private vx = 0;
  private vy = 0;
  private elapsed = 0;

  // from: -1 enters from the left edge, 1 from the right.
  constructor(
    private readonly from: number,
    entryY: number,
  ) {
    this.x = from < 0 ? -1 : VIEW.w;
    this.y = entryY;
  }

  // True once the warning is over and the comet is waiting to be aimed.
  get ready(): boolean {
    return this.phase === 'warning' && this.elapsed >= COMET.warnTime;
  }

  launch(tx: number, ty: number): void {
    const dx = tx - this.x;
    const dy = Math.max(10, ty - this.y); // always heading down the screen
    const len = Math.hypot(dx, dy);
    this.vx = (dx / len) * COMET.speed;
    this.vy = (dy / len) * COMET.speed;
    this.phase = 'flying';
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.phase !== 'flying') return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const m = COMET.trail + 4;
    if (this.x < -m || this.x > VIEW.w + m || this.y > VIEW.h + m) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'warning') {
      // Same blink as an asteroid's warning, speeding up toward the end, at the edge it comes in from.
      const urgent = this.elapsed > COMET.warnTime * ASTEROID.urgentAt;
      const blink = urgent ? ASTEROID.blinkFramesUrgent : ASTEROID.blinkFrames;
      if (Math.floor((this.elapsed * 60) / blink) % 2) return;
      const x = this.from < 0 ? 0 : VIEW.w - WARNING.width;
      const y = Math.max(HUD.playTop + 1, Math.round(this.y) - Math.floor(WARNING.height / 2));
      ctx.drawImage(WARNING, x, y);
      return;
    }
    // Tail: solid orange near the head, thinning to a dotted cream line.
    const len = Math.hypot(this.vx, this.vy) || 1;
    const ux = this.vx / len;
    const uy = this.vy / len;
    for (let k = COMET.trail; k >= 1; k--) {
      const near = k <= 5;
      if (!near && k % 2) continue;
      ctx.fillStyle = near ? PALETTE.detail : PALETTE.rocket;
      ctx.fillRect(snap(this.x - ux * k), snap(this.y - uy * k), 1, 1);
    }
    // Head: a small cream cross.
    const hx = snap(this.x);
    const hy = snap(this.y);
    ctx.fillStyle = PALETTE.rocket;
    ctx.fillRect(hx - 1, hy, 3, 1);
    ctx.fillRect(hx, hy - 1, 1, 3);
  }
}
