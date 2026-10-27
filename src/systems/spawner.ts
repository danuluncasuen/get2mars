import { ASTEROID, ROCKET, VIEW } from '../config';
import { Asteroid } from '../entities/asteroid';
import type { Difficulty } from './difficulty';

// Largest free horizontal span left by a set of lanes, within the screen.
function largestGap(lanes: number[]): number {
  const spans = lanes.map((cx) => [cx - ASTEROID.radius, cx + ASTEROID.radius]).sort((a, b) => a[0] - b[0]);
  let gap = 0;
  let cursor = 0;
  for (const [l, r] of spans) {
    gap = Math.max(gap, l - cursor);
    cursor = Math.max(cursor, r);
  }
  return Math.max(gap, VIEW.w - cursor);
}

function randomLane(): number {
  return Math.round(ASTEROID.laneMin + Math.random() * (ASTEROID.laneMax - ASTEROID.laneMin));
}

export class AsteroidSpawner {
  private timer: number = ASTEROID.firstSpawn;

  reset(): void {
    this.timer = ASTEROID.firstSpawn;
  }

  update(dt: number, d: Difficulty, active: Asteroid[]): Asteroid[] {
    this.timer -= dt;
    if (this.timer > 0) return [];

    // Only rocks that can still reach the rocket limit new spawns.
    const threats = active.filter((a) => !a.dead && a.centerY < ROCKET.y + ROCKET.h);
    const room = d.maxAsteroids - threats.length;
    if (room <= 0) {
      this.timer = ASTEROID.retryDelay;
      return [];
    }

    const want = room >= 2 && Math.random() < ASTEROID.pairChance ? 2 : 1;
    const lanes = threats.map((a) => a.cx);
    const spawned: Asteroid[] = [];
    for (let n = 0; n < want; n++) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const cx = randomLane();
        if (largestGap([...lanes, cx]) < ASTEROID.minGap) continue;
        lanes.push(cx);
        spawned.push(new Asteroid(cx, d.warnTime, d.fallSpeed));
        break;
      }
    }
    this.timer = spawned.length ? d.asteroidInterval : ASTEROID.retryDelay;
    return spawned;
  }
}
