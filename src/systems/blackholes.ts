import { BLACK_HOLE, ROCKET } from '../config';
import { BlackHole } from '../entities/blackhole';

export class BlackHoleSpawner {
  private timer = 0;

  reset(): void {
    this.timer = 0;
  }

  // Only runs once holes are unlocked; the first one comes right away. Opens on the side
  // away from the rocket so it never appears on top of it.
  update(dt: number, rocketX: number, busy: boolean): BlackHole | null {
    this.timer -= dt;
    if (this.timer > 0 || busy) return null;
    this.timer = BLACK_HOLE.intervalMin + Math.random() * (BLACK_HOLE.intervalMax - BLACK_HOLE.intervalMin);
    const [left, right] = BLACK_HOLE.xs;
    const x = rocketX + ROCKET.w / 2 < (left + right) / 2 ? right : left;
    const y = BLACK_HOLE.yMin + Math.random() * (BLACK_HOLE.yMax - BLACK_HOLE.yMin);
    return new BlackHole(x, Math.round(y));
  }
}
