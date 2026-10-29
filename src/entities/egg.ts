import { EGG_DROP, PALETTE, VIEW } from '../config';
import { FALLING_EGG_MAP, makeSprite } from '../sprites';
import type { Box } from './rocket';

// splat: cream, yolk covers the screen. reverse: orange, controls swap. golden: a prize.
export type EggKind = 'splat' | 'reverse' | 'golden';

const CREAM = makeSprite(FALLING_EGG_MAP, { X: PALETTE.rocket });
const ORANGE = makeSprite(FALLING_EGG_MAP, { X: PALETTE.detail });

export function randomEggKind(): EggKind {
  const r = Math.random();
  if (r < EGG_DROP.goldenChance) return 'golden';
  if (r < EGG_DROP.goldenChance + EGG_DROP.reverseChance) return 'reverse';
  return 'splat';
}

// An egg dropped by a chicken, falling straight down.
export class Egg {
  dead = false;
  private age = 0;

  constructor(
    public x: number,
    public y: number,
    readonly kind: EggKind,
  ) {}

  get hitbox(): Box {
    return { x: this.x, y: this.y, w: EGG_DROP.w, h: EGG_DROP.h };
  }

  update(dt: number): void {
    this.age += dt;
    this.y += EGG_DROP.fallSpeed * dt;
    if (this.y > VIEW.h) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    let sprite = this.kind === 'reverse' ? ORANGE : CREAM;
    // Golden eggs flash between the two colors.
    if (this.kind === 'golden') sprite = Math.floor((this.age * 60) / EGG_DROP.goldenBlinkFrames) % 2 ? ORANGE : CREAM;
    ctx.drawImage(sprite, Math.round(this.x), Math.round(this.y));
  }
}
