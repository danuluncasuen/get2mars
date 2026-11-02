import { PALETTE, POWERUP, VIEW, type PowerKind } from '../config';
import { makeSprite, PICKUP_MAPS } from '../sprites';
import type { Box } from './rocket';
import { snap } from '../pixel';

// Power-ups help, so the box stays cream; the glyph blinks orange / navy to catch the eye.
const SPRITES = Object.fromEntries(
  (Object.keys(PICKUP_MAPS) as PowerKind[]).map((k) => [
    k,
    [
      makeSprite(PICKUP_MAPS[k], { B: PALETTE.rocket, G: PALETTE.detail }),
      makeSprite(PICKUP_MAPS[k], { B: PALETTE.rocket, G: PALETTE.bg }),
    ],
  ]),
) as Record<PowerKind, HTMLCanvasElement[]>;

// A power-up box drifting down its lane; fly into it to collect it.
export class Pickup {
  y = -POWERUP.size;
  dead = false;
  private age = 0;

  constructor(
    readonly x: number,
    readonly kind: PowerKind,
  ) {}

  get hitbox(): Box {
    return { x: this.x, y: this.y, w: POWERUP.size, h: POWERUP.size };
  }

  update(dt: number): void {
    this.age += dt;
    this.y += POWERUP.fallSpeed * dt;
    if (this.y > VIEW.h) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const swap = Math.floor((this.age * 60) / POWERUP.colorSwapFrames) % 2;
    ctx.drawImage(SPRITES[this.kind][swap], snap(this.x), snap(this.y));
  }
}
