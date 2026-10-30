import { BLACK_HOLE, PALETTE, ROCKET, VIEW } from '../config';
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
  // Px offset of the target toward a black hole, set by the game every frame.
  pullX = 0;
  pullY = 0;
  private touchTime = Infinity; // s since the finger last went down

  reset(): void {
    this.pullX = 0;
    this.pullY = 0;
    this.touchTime = Infinity;
    this.x = START_X;
    this.y = ROCKET.startY;
    this.reversed = false;
    this.speedScale = 1;
  }

  update(dt: number, input: Input): void {
    const scale = this.speedScale;
    if (input.pointerX !== null && input.pointerY !== null) {
      this.touchTime = this.touchTime === Infinity ? 0 : this.touchTime + dt;
      const fingerX = this.reversed ? VIEW.w - input.pointerX : input.pointerX;
      const tx = fingerX - ROCKET.w / 2 + this.pullX;
      const ty = input.pointerY - ROCKET.fingerOffset - ROCKET.h / 2 + this.pullY;
      // Frame-rate independent ease toward the finger, capped at max speed in any direction.
      const ease = 1 - Math.pow(1 - ROCKET.follow * scale, dt * 60);
      const dx = (tx - this.x) * ease;
      const dy = (ty - this.y) * ease;
      // Eases in from catchSpeed to maxSpeed after a new touch, so it never jumps across.
      const t = Math.min(1, this.touchTime / ROCKET.catchTime);
      const top = ROCKET.catchSpeed + (ROCKET.maxSpeed - ROCKET.catchSpeed) * t * t * (3 - 2 * t);
      const maxStep = top * scale * dt;
      const k = Math.min(1, maxStep / (Math.hypot(dx, dy) || 1));
      this.x += dx * k;
      this.y += dy * k;
    } else {
      this.touchTime = Infinity;
      const dir = this.reversed ? -input.keyDir : input.keyDir;
      this.x += dir * ROCKET.keySpeed * scale * dt;
      this.y += input.keyDirY * ROCKET.keySpeed * scale * dt;
      // Without a finger holding it, the rocket drifts into a black hole's pull.
      this.x += this.pullX * BLACK_HOLE.driftRate * dt;
      this.y += this.pullY * BLACK_HOLE.driftRate * dt;
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
