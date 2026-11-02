import { COMET, DEBRIS, ROCKET } from '../config';
import { Comet } from '../entities/comet';
import { Debris } from '../entities/debris';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Only runs once comets are unlocked; the first one comes right away.
export class CometSpawner {
  private timer = 0;

  reset(): void {
    this.timer = 0;
  }

  update(dt: number): Comet | null {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = rand(COMET.intervalMin, COMET.intervalMax);
    return new Comet(Math.random() < 0.5 ? -1 : 1, Math.round(rand(COMET.entryYMin, COMET.entryYMax)));
  }
}

// Only runs once debris is unlocked; sends pieces in pairs from one side.
export class DebrisSpawner {
  private timer = 0;

  reset(): void {
    this.timer = 0;
  }

  update(dt: number): Debris[] {
    this.timer -= dt;
    if (this.timer > 0) return [];
    this.timer = rand(DEBRIS.intervalMin, DEBRIS.intervalMax);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const speed = rand(DEBRIS.speedMin, DEBRIS.speedMax);
    // Anywhere the rocket can be, keeping the second piece inside the band too.
    const top = ROCKET.yMin + DEBRIS.pairDy;
    const bottom = ROCKET.yMax + ROCKET.h - 3 - DEBRIS.pairDy;
    const y = Math.round(rand(top, bottom));
    const y2 = y + (Math.random() < 0.5 ? -DEBRIS.pairDy : DEBRIS.pairDy);
    const lead = Math.random() < 0.5 ? 0 : 1;
    return [new Debris(dir, y, speed, lead, 0), new Debris(dir, y2, speed, 1 - lead, DEBRIS.pairDx)];
  }
}
