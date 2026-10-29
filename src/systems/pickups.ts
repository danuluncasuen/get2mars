import { POWERUP, type PowerKind } from '../config';
import type { Asteroid } from '../entities/asteroid';
import { Pickup } from '../entities/pickup';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class PickupSpawner {
  private timer: number = POWERUP.firstSpawn;

  reset(): void {
    this.timer = POWERUP.firstSpawn;
  }

  // needsClear: whether a CLEAR would help right now; it only shows up then.
  update(dt: number, needsClear: boolean, asteroids: Asteroid[]): Pickup | null {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = rand(POWERUP.intervalMin, POWERUP.intervalMax);

    let kind: PowerKind = Math.random() < 0.5 ? 'shield' : 'time';
    if (needsClear && Math.random() < POWERUP.eggsChance) kind = 'eggs';

    // Stay out of lanes that are about to get an asteroid.
    const warned = asteroids.filter((a) => a.phase === 'warning').map((a) => a.cx);
    let x = rand(POWERUP.xMin, POWERUP.xMax);
    for (let tries = 0; tries < 10; tries++) {
      if (warned.every((cx) => Math.abs(x + POWERUP.size / 2 - cx) >= POWERUP.laneClear)) break;
      x = rand(POWERUP.xMin, POWERUP.xMax);
    }
    return new Pickup(Math.round(x), kind);
  }
}
