import { PALETTE, STAR_TRAIL, VIEW } from '../config';
import type { Box } from '../entities/rocket';
import { makeSprite, STAR_MAP } from '../sprites';
import { boxesOverlap } from './collision';

const STAR = makeSprite(STAR_MAP, { X: PALETTE.rocket });
const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Trail {
  total: number;
  got: number;
  missed: boolean;
}

interface Star {
  x: number;
  y: number;
  trail: Trail;
  dead: boolean;
}

// What happened when the rocket touched a star.
export interface StarHit {
  x: number;
  y: number;
  index: number; // 0 for the first star taken from its trail, then 1, 2...
  perfect: boolean; // this star completed its trail with none missed
}

// Lines of small cream stars that sway across lanes as they fall.
export class StarTrails {
  private stars: Star[] = [];
  private timer = 0;

  reset(): void {
    this.stars = [];
    this.timer = 0;
  }

  // spawning: whether trails are unlocked yet; existing stars always keep falling.
  update(dt: number, spawning: boolean): void {
    if (spawning) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = rand(STAR_TRAIL.intervalMin, STAR_TRAIL.intervalMax);
        this.spawn();
      }
    }
    for (const s of this.stars) {
      s.y += STAR_TRAIL.fallSpeed * dt;
      if (s.y > VIEW.h) {
        s.dead = true;
        s.trail.missed = true;
      }
    }
    this.stars = this.stars.filter((s) => !s.dead);
  }

  private spawn(): void {
    const count = Math.floor(rand(STAR_TRAIL.countMin, STAR_TRAIL.countMax + 1));
    const amp = rand(STAR_TRAIL.amplitudeMin, STAR_TRAIL.amplitudeMax);
    const half = STAR_TRAIL.size / 2;
    // Keep the whole sway on screen.
    const cx = rand(amp + half, VIEW.w - amp - half);
    const phase = rand(0, Math.PI * 2);
    const trail: Trail = { total: count, got: 0, missed: false };
    for (let i = 0; i < count; i++) {
      const x = cx + Math.sin(phase + i * STAR_TRAIL.sway) * amp - half;
      // The first star leads; the rest follow above it, off screen.
      this.stars.push({ x: Math.round(x), y: -STAR_TRAIL.size - i * STAR_TRAIL.spacing, trail, dead: false });
    }
  }

  // Takes every star touching the box.
  collect(box: Box): StarHit[] {
    const hits: StarHit[] = [];
    for (const s of this.stars) {
      if (s.dead) continue;
      if (!boxesOverlap({ x: s.x, y: s.y, w: STAR_TRAIL.size, h: STAR_TRAIL.size }, box)) continue;
      s.dead = true;
      const index = s.trail.got++;
      const perfect = !s.trail.missed && s.trail.got === s.trail.total;
      hits.push({ x: s.x + 1, y: s.y + 1, index, perfect });
    }
    return hits;
  }

  render(ctx: CanvasRenderingContext2D, frame: number): void {
    this.stars.forEach((s, i) => {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      // Each star twinkles to a single pixel for a moment, staggered along the line.
      if (Math.floor(frame / STAR_TRAIL.twinkleFrames + i) % 5 === 0) {
        ctx.fillStyle = PALETTE.rocket;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      } else ctx.drawImage(STAR, x, y);
    });
  }

  // For the debug overlay.
  get boxes(): Box[] {
    return this.stars.map((s) => ({ x: s.x, y: s.y, w: STAR_TRAIL.size, h: STAR_TRAIL.size }));
  }
}
