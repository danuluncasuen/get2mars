import { PALETTE, STARS, VIEW } from '../config';
import { snap } from '../pixel';

// Star shapes as pixel offsets from the star's position. All orange: the cream 3x3 plus is
// the collectible star, so background stars never use it.
const SHAPES: Record<string, readonly (readonly [number, number])[]> = {
  dot: [[0, 0]],
  streak: [[0, 0], [0, 1]], // a near star blurred by speed
  cross: [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]], // small x
  sparkle: [[0, 0], [0, -2], [0, 2], [-2, 0], [2, 0]], // dotted, twinkles down to its center
};
type Shape = keyof typeof SHAPES;

// Far stars are nearly all dots; near ones are bigger, so size and speed read as depth.
const FAR: Shape[] = ['dot', 'dot', 'dot', 'dot', 'dot', 'dot', 'cross'];
const NEAR: Shape[] = ['dot', 'streak', 'streak', 'cross', 'sparkle'];

interface Star {
  x: number;
  y: number;
  speed: number;
  shape: Shape;
}

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

// Two parallax layers of orange stars in a few sizes and shapes, wrapping vertically.
export class Starfield {
  private readonly stars: Star[] = [];

  constructor() {
    for (let i = 0; i < STARS.count; i++) {
      const near = Math.random() < STARS.nearShare;
      this.stars.push({
        x: Math.floor(Math.random() * VIEW.w),
        y: Math.random() * VIEW.h,
        speed: near ? STARS.nearSpeed : STARS.farSpeed,
        shape: pick(near ? NEAR : FAR),
      });
    }
  }

  update(dt: number, speedFactor = 1): void {
    for (const s of this.stars) {
      s.y += s.speed * speedFactor * dt;
      // A little past the bottom, so bigger shapes leave the screen fully before wrapping.
      if (s.y >= VIEW.h + 2) s.y -= VIEW.h + 4;
    }
  }

  render(ctx: CanvasRenderingContext2D, frame: number): void {
    ctx.fillStyle = PALETTE.detail;
    const phase = Math.floor(frame / STARS.blinkFrames);
    this.stars.forEach((s, i) => {
      const twinkle = (i + phase) % STARS.blinkEvery === 0;
      if (twinkle && s.shape === 'dot') return;
      // Bigger stars twinkle down to their center pixel instead of vanishing.
      const pixels = twinkle ? SHAPES.dot : SHAPES[s.shape];
      const y = snap(s.y);
      for (const [dx, dy] of pixels) ctx.fillRect(s.x + dx, y + dy, 1, 1);
    });
  }
}
