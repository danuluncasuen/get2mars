import { BLACK_HOLE, DEBRIS, PALETTE, ROCKET, VIEW } from '../config';
import type { Input } from '../input';
import { registerSprite, ROCKET_COLORS, ROCKET_MAP } from '../sprites';
import { snap } from '../pixel';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Leaning sprites, sheared so the nose tips into the move while the base stays put: row offsets
// for one and two steps of lean. Drawn BANK_PAD px wider on each side to leave room.
const BANK_PAD = 2;
const LEANS = [
  ROCKET_MAP.map((_, y) => (y < 6 ? 1 : 0)),
  ROCKET_MAP.map((_, y) => (y < 4 ? 2 : y < 8 ? 1 : 0)),
];

function makeLean(offsets: number[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ROCKET.w + BANK_PAD * 2;
  canvas.height = ROCKET.h;
  const ctx = canvas.getContext('2d')!;
  ROCKET_MAP.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = ROCKET_COLORS[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x + BANK_PAD + offsets[y], y, 1, 1);
    });
  });
  return registerSprite(canvas);
}

// Indexed by lean, -2 (hard left) to 2 (hard right).
const BANKED: Record<number, HTMLCanvasElement> = { 0: makeLean(ROCKET_MAP.map(() => 0)) };
LEANS.forEach((offsets, i) => {
  BANKED[i + 1] = makeLean(offsets);
  BANKED[-(i + 1)] = makeLean(offsets.map((o) => -o));
});
const MAX_X = VIEW.w - ROCKET.w;
const START_X = (VIEW.w - ROCKET.w) / 2;

export class Rocket {
  x = START_X;
  y: number = ROCKET.startY;
  // Share of normal speed; below 1 while dazed by a chicken.
  speedScale = 1;
  // Px offset of the target toward a black hole, set by the game every frame.
  pullX = 0;
  pullY = 0;
  // Px sideways shove from debris, fading out on its own.
  pushX = 0;
  private touchTime = Infinity; // s since the finger last went down
  private sideSpeed = 0; // smoothed px/s sideways, for banking

  reset(): void {
    this.pullX = 0;
    this.pullY = 0;
    this.pushX = 0;
    this.sideSpeed = 0;
    this.touchTime = Infinity;
    this.x = START_X;
    this.y = ROCKET.startY;
    this.speedScale = 1;
  }

  update(dt: number, input: Input): void {
    const scale = this.speedScale;
    const startX = this.x;
    this.pushX *= Math.exp(-dt / DEBRIS.pushDecay);
    if (input.pointerX !== null && input.pointerY !== null) {
      this.touchTime = this.touchTime === Infinity ? 0 : this.touchTime + dt;
      const tx = input.pointerX - ROCKET.w / 2 + this.pullX + this.pushX;
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
      this.x += input.keyDir * ROCKET.keySpeed * scale * dt;
      this.y += input.keyDirY * ROCKET.keySpeed * scale * dt;
      // Without a finger holding it, the rocket drifts into a black hole's pull.
      this.x += this.pullX * BLACK_HOLE.driftRate * dt;
      this.y += this.pullY * BLACK_HOLE.driftRate * dt;
      this.x += this.pushX * DEBRIS.keyPush * dt;
    }
    this.x = Math.max(0, Math.min(MAX_X, this.x));
    this.y = Math.max(ROCKET.yMin, Math.min(ROCKET.yMax, this.y));
    const speed = (this.x - startX) / dt;
    this.sideSpeed += (speed - this.sideSpeed) * Math.min(1, dt * ROCKET.bankSmoothing);
  }

  // -2 to 2: how far the rocket leans into its sideways move.
  get lean(): number {
    const s = Math.abs(this.sideSpeed);
    const steps = s > ROCKET.bankFast ? 2 : s > ROCKET.bankSlow ? 1 : 0;
    return Math.sign(this.sideSpeed) * steps;
  }

  get hitbox(): Box {
    const i = ROCKET.hitboxInset;
    return { x: this.x + i, y: this.y + i, w: ROCKET.w - i * 2, h: ROCKET.h - i * 2 };
  }

  // wobble: extra horizontal offset in px, used for the chicken-hit shake.
  render(ctx: CanvasRenderingContext2D, frame: number, wobble = 0): void {
    const x = snap(this.x + wobble);
    const y = snap(this.y);
    const lean = this.lean;
    // Flame flickers between a short and a long burn; while dazed it sputters and drops out.
    // Banking, its tip trails behind the move.
    const tail = -Math.sign(lean);
    ctx.fillStyle = PALETTE.detail;
    if (this.speedScale < 1) {
      const beat = Math.floor(frame / ROCKET.dazedFlameFrames) % 3;
      if (beat === 1) ctx.fillRect(x + 3, y + 12, 3, 1);
      if (beat === 2) ctx.fillRect(x + 4 + tail, y + 12, 1, 2);
    } else {
      const long = Math.floor(frame / ROCKET.flameToggleFrames) % 2 === 1;
      const len = long ? 4 : 2;
      ctx.fillRect(x + 3, y + 12, 3, len);
      ctx.fillRect(x + 4 + tail, y + 12 + len, 1, 2);
    }
    ctx.drawImage(BANKED[lean], x - BANK_PAD, y);
  }
}
