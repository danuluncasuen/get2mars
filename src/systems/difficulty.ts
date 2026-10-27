import { DIFFICULTY, type DifficultyRow } from '../config';

export type Difficulty = Omit<DifficultyRow, 't'>;

// Linear blend between the two table rows around `time`; counts are rounded down.
export function sampleDifficulty(time: number): Difficulty {
  const rows = DIFFICULTY;
  let i = 0;
  while (i < rows.length - 1 && time >= rows[i + 1].t) i++;
  const a = rows[i];
  const b = rows[Math.min(i + 1, rows.length - 1)];
  const k = b.t > a.t ? Math.min(1, (time - a.t) / (b.t - a.t)) : 0;
  const mix = (x: number, y: number) => x + (y - x) * k;
  return {
    asteroidInterval: mix(a.asteroidInterval, b.asteroidInterval),
    warnTime: mix(a.warnTime, b.warnTime),
    fallSpeed: mix(a.fallSpeed, b.fallSpeed),
    maxAsteroids: Math.floor(mix(a.maxAsteroids, b.maxAsteroids)),
    chickenInterval: mix(a.chickenInterval, b.chickenInterval),
    flockMin: Math.floor(mix(a.flockMin, b.flockMin)),
    flockMax: Math.floor(mix(a.flockMax, b.flockMax)),
    chickenSpeed: mix(a.chickenSpeed, b.chickenSpeed),
  };
}
