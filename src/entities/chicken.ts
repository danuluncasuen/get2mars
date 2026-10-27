import { CHICKEN, VIEW } from '../config';
import { CHICKEN_A, CHICKEN_B, CHICKEN_COLORS, makeSprite } from '../sprites';
import type { Box } from './rocket';

// [wings up, wings down], one set per facing.
const RIGHT = [makeSprite(CHICKEN_A, CHICKEN_COLORS), makeSprite(CHICKEN_B, CHICKEN_COLORS)];
const LEFT = [makeSprite(CHICKEN_A, CHICKEN_COLORS, true), makeSprite(CHICKEN_B, CHICKEN_COLORS, true)];
const MARGIN = 40; // how far off screen a chicken may go before it is removed

// Dives diagonally across the screen; after hitting the rocket it tumbles away harmlessly.
export class Chicken {
  state: 'flying' | 'tumbling' = 'flying';
  dead = false;
  private readonly dir: number;
  private age = 0;

  constructor(
    public x: number,
    public y: number,
    private vx: number,
    private vy: number,
  ) {
    this.dir = Math.sign(vx);
  }

  get hitbox(): Box {
    const i = CHICKEN.hitboxInset;
    return { x: this.x + i, y: this.y + i, w: CHICKEN.w - i * 2, h: CHICKEN.h - i * 2 };
  }

  // away: -1 to tumble left, 1 to tumble right.
  tumble(away: number): void {
    this.state = 'tumbling';
    this.vx = away * CHICKEN.tumbleVx;
    this.vy = CHICKEN.tumbleVy;
  }

  update(dt: number): void {
    this.age += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const gone =
      (this.vx > 0 && this.x > VIEW.w + MARGIN) ||
      (this.vx < 0 && this.x < -CHICKEN.w - MARGIN) ||
      this.y < -CHICKEN.h - MARGIN ||
      this.y > VIEW.h + MARGIN;
    if (gone) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const flap = this.state === 'tumbling' ? CHICKEN.tumbleFlapFrames : CHICKEN.flapFrames;
    const frame = Math.floor((this.age * 60) / flap) % 2;
    // A tumbling chicken faces the way it is thrown.
    const facingRight = this.state === 'tumbling' ? this.vx > 0 : this.dir > 0;
    ctx.drawImage((facingRight ? RIGHT : LEFT)[frame], Math.round(this.x), Math.round(this.y));
  }
}
