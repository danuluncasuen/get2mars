import { PALETTE, ROCKET, VIEW } from '../config';
import type { Input } from '../input';
import { makeSprite, ROCKET_COLORS, ROCKET_MAP } from '../sprites';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SPRITE = makeSprite(ROCKET_MAP, ROCKET_COLORS);
const MAX_X = VIEW.w - ROCKET.w;

export class Rocket {
  x = (VIEW.w - ROCKET.w) / 2;
  readonly y = ROCKET.y;
  // When true, left and right swap (chicken hit, M4).
  reversed = false;

  reset(): void {
    this.x = (VIEW.w - ROCKET.w) / 2;
    this.reversed = false;
  }

  update(dt: number, input: Input): void {
    if (input.pointerX !== null) {
      const fingerX = this.reversed ? VIEW.w - input.pointerX : input.pointerX;
      const target = fingerX - ROCKET.w / 2;
      // Frame-rate independent ease toward the finger, capped at max speed.
      const ease = 1 - Math.pow(1 - ROCKET.follow, dt * 60);
      const maxStep = ROCKET.maxSpeed * dt;
      const step = Math.max(-maxStep, Math.min(maxStep, (target - this.x) * ease));
      this.x += step;
    } else if (input.keyDir !== 0) {
      const dir = this.reversed ? -input.keyDir : input.keyDir;
      this.x += dir * ROCKET.maxSpeed * dt;
    }
    this.x = Math.max(0, Math.min(MAX_X, this.x));
  }

  get hitbox(): Box {
    const i = ROCKET.hitboxInset;
    return { x: this.x + i, y: this.y + i, w: ROCKET.w - i * 2, h: ROCKET.h - i * 2 };
  }

  // wobble: extra horizontal offset in px, used for the chicken-hit shake.
  render(ctx: CanvasRenderingContext2D, frame: number, wobble = 0): void {
    const x = Math.round(this.x + wobble);
    const y = this.y;
    // Flame flickers between a short and a long burn.
    const long = Math.floor(frame / ROCKET.flameToggleFrames) % 2 === 1;
    const len = long ? 4 : 2;
    ctx.fillStyle = PALETTE.detail;
    ctx.fillRect(x + 3, y + 12, 3, len);
    ctx.fillRect(x + 4, y + 12 + len, 1, 2);
    ctx.drawImage(SPRITE, x, y);
  }
}
