import { CHICKEN, ROCKET, VIEW } from '../config';
import { Chicken } from '../entities/chicken';
import type { Difficulty } from './difficulty';

// Flocks come in V shapes of 1, 3 or 5.
function flockSize(d: Difficulty): number {
  const n = d.flockMin + Math.floor(Math.random() * (d.flockMax - d.flockMin + 1));
  return n >= 5 ? 5 : n >= 3 ? 3 : 1;
}

export class FlockSpawner {
  private timer: number = CHICKEN.firstSpawn;

  reset(): void {
    this.timer = CHICKEN.firstSpawn;
  }

  // rocketX: where the rocket is now, so some flocks can dive at it.
  update(dt: number, d: Difficulty, rocketX: number): Chicken[] {
    this.timer -= dt;
    if (this.timer > 0) return [];
    this.timer = d.chickenInterval;

    const speed = d.chickenSpeed * (1 + (Math.random() * 2 - 1) * CHICKEN.speedJitter);
    // Pick where the leader crosses the rocket's row, then trace back to where it enters the screen.
    const crossY = ROCKET.y + ROCKET.h / 2 - CHICKEN.h / 2;
    const crossX =
      Math.random() < CHICKEN.aimChance
        ? rocketX + ROCKET.w / 2 - CHICKEN.w / 2 + (Math.random() * 2 - 1) * 4
        : -CHICKEN.w / 2 + Math.random() * VIEW.w;
    // Enter from the far side, so the flock is on screen a while before it reaches the rocket.
    const dir = crossX + CHICKEN.w / 2 < VIEW.w / 2 ? -1 : 1;
    const vx = dir * speed;
    const vy = speed * CHICKEN.descent;
    const sideX = dir > 0 ? -CHICKEN.w : VIEW.w;
    const sideY = crossY - (vy * (crossX - sideX)) / vx;
    let leaderX = sideX;
    let leaderY = sideY;
    if (sideY < -CHICKEN.h) {
      // Too far up to come in from the side: drop in from the top instead.
      leaderY = -CHICKEN.h;
      leaderX = crossX - (vx * (crossY - leaderY)) / vy;
    }

    // Followers trail behind along the flight path, fanned out a little to each side.
    const len = Math.hypot(vx, vy);
    const ux = vx / len;
    const uy = vy / len;
    const flock: Chicken[] = [new Chicken(leaderX, leaderY, vx, vy)];
    const rows = (flockSize(d) - 1) / 2;
    for (let k = 1; k <= rows; k++) {
      const bx = leaderX - k * CHICKEN.trail * ux;
      const by = leaderY - k * CHICKEN.trail * uy;
      const sx = -uy * k * CHICKEN.spread;
      const sy = ux * k * CHICKEN.spread;
      flock.push(new Chicken(bx + sx, by + sy, vx, vy));
      flock.push(new Chicken(bx - sx, by - sy, vx, vy));
    }
    return flock;
  }
}
