import { DEBRIS, PALETTE, VIEW } from '../config';
import { makeSprite, type SpriteMap } from '../sprites';
import type { Box } from './rocket';
import { snap } from '../pixel';

// A broken solar panel and a chunk of hull; L marks the blinking light.
const SHAPES: SpriteMap[] = [
  ['X.X.X', 'XXLXX', 'X.X.X'],
  ['XX.', 'XLX', '.XX'],
];
const SPRITES = SHAPES.map((m) => makeSprite(m, { X: PALETTE.rocket, L: PALETTE.rocket }));

// One piece of satellite debris, drifting sideways at a steady speed.
export class Debris {
  phase: 'warning' | 'flying' = 'warning';
  dead = false;
  x: number;
  private elapsed = 0;
  private readonly shape: SpriteMap;
  private readonly sprite: HTMLCanvasElement;

  // dir: 1 drifts right, -1 left. lag: px further off screen than the lead piece.
  constructor(
    readonly dir: number,
    public y: number,
    private readonly speed: number,
    kind: number,
    lag: number,
  ) {
    this.shape = SHAPES[kind];
    this.sprite = SPRITES[kind];
    this.x = dir > 0 ? -this.sprite.width - lag : VIEW.w + lag;
  }

  get hitbox(): Box {
    return { x: this.x, y: this.y, w: this.sprite.width, h: this.sprite.height };
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.phase === 'warning') {
      if (this.elapsed >= DEBRIS.warnTime) this.phase = 'flying';
      return;
    }
    this.x += this.dir * this.speed * dt;
    const w = this.sprite.width;
    if ((this.dir > 0 && this.x > VIEW.w + w) || (this.dir < 0 && this.x < -w * 2)) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const y = snap(this.y);
    if (this.phase === 'warning') {
      // A short orange tick on the edge it comes in from.
      if (Math.floor((this.elapsed * 60) / 5) % 2) return;
      ctx.fillStyle = PALETTE.detail;
      ctx.fillRect(this.dir > 0 ? 0 : VIEW.w - 1, y, 1, this.sprite.height);
      return;
    }
    const x = snap(this.x);
    ctx.drawImage(this.sprite, x, y);
    // The light blinks orange.
    if (Math.floor((this.elapsed * 60) / 10) % 2 === 0) {
      ctx.fillStyle = PALETTE.detail;
      this.shape.forEach((row, j) => {
        const i = row.indexOf('L');
        if (i >= 0) ctx.fillRect(x + i, y + j, 1, 1);
      });
    }
  }
}
