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
const START_X = (VIEW.w - ROCKET.w) / 2;

export class Rocket {
  x = START_X;
  y: number = ROCKET.startY;
  // When true, left and right swap (orange egg).
  reversed = false;
  // Share of normal speed; below 1 while dazed by a chicken.
  speedScale = 1;

  reset(): void {
    this.x = START_X;
    this.y = ROCKET.startY;
    this.reversed = false;
    this.speedScale = 1;
  }

  update(dt: number, input: Input): void {
    const scale = this.speedScale;
    if (input.pointerX !== null && input.pointerY !== null) {
      const fingerX = this.reversed ? VIEW.w - input.pointerX : input.pointerX;
      const tx = fingerX - ROCKET.w / 2;
      const ty = input.pointerY - ROCKET.fingerOffset - ROCKET.h / 2;
      // Frame-rate independent ease toward the finger, capped at max speed in any direction.
      const ease = 1 - Math.pow(1 - ROCKET.follow * scale, dt * 60);
      const dx = (tx - this.x) * ease;
      const dy = (ty - this.y) * ease;
      const maxStep = ROCKET.maxSpeed * scale * dt;
      const k = Math.min(1, maxStep / (Math.hypot(dx, dy) || 1));
      this.x += dx * k;
      this.y += dy * k;
    } else if (input.keyDir !== 0 || input.keyDirY !== 0) {
      const dir = this.reversed ? -input.keyDir : input.keyDir;
      this.x += dir * ROCKET.keySpeed * scale * dt;
      this.y += input.keyDirY * ROCKET.keySpeed * scale * dt;
    }
    this.x = Math.max(0, Math.min(MAX_X, this.x));
    this.y = Math.max(ROCKET.yMin, Math.min(ROCKET.yMax, this.y));
  }

  get hitbox(): Box {
    const i = ROCKET.hitboxInset;
    return { x: this.x + i, y: this.y + i, w: ROCKET.w - i * 2, h: ROCKET.h - i * 2 };
  }

  // wobble: extra horizontal offset in px, used for the chicken-hit shake.
  render(ctx: CanvasRenderingContext2D, frame: number, wobble = 0): void {
    const x = Math.round(this.x + wobble);
    const y = Math.round(this.y);
    // Flame flickers between a short and a long burn; while dazed it sputters and drops out.
    ctx.fillStyle = PALETTE.detail;
    if (this.speedScale < 1) {
      const beat = Math.floor(frame / ROCKET.dazedFlameFrames) % 3;
      if (beat === 1) ctx.fillRect(x + 3, y + 12, 3, 1);
      if (beat === 2) ctx.fillRect(x + 4, y + 12, 1, 2);
    } else {
      const long = Math.floor(frame / ROCKET.flameToggleFrames) % 2 === 1;
      const len = long ? 4 : 2;
      ctx.fillRect(x + 3, y + 12, 3, len);
      ctx.fillRect(x + 4, y + 12 + len, 1, 2);
    }
    ctx.drawImage(SPRITE, x, y);
  }
}
