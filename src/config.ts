// Every tunable number lives here. See rocket-dodge-mvp.md for the reasoning behind each value.

// The only three colors allowed on screen.
export const PALETTE = {
  bg: '#1B1F3B', // navy: sky, letterbox, craters, text on cream
  rocket: '#F2E9DC', // cream: player, chickens, HUD text
  detail: '#ff6a34', // orange: danger, flame, stars, warnings
} as const;

// Logical resolution; everything is drawn at this size and scaled up by an integer.
export const VIEW = { w: 72, h: 144 } as const;

// Fixed simulation step and the longest frame gap we will try to catch up on.
export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

export const ROCKET = {
  w: 9,
  h: 12,
  y: 112,
  maxSpeed: 300, // px/s when following a finger
  follow: 0.35, // fraction of the gap to the finger closed per 1/60 s
  keySpeed: 140, // px/s with the arrow keys
  hitboxInset: 1,
  flameToggleFrames: 4,
} as const;

export const STARS = {
  count: 22,
  nearSpeed: 60, // px/s
  farSpeed: 30,
  nearShare: 0.3,
  blinkEvery: 6, // every Nth star blinks
  blinkFrames: 16,
} as const;

// Top bar; the play area starts just below it.
export const HUD = {
  barHeight: 15, // y 0–14 bar, y 15 orange line
  playTop: 16,
  font: "8px 'Press Start 2P'",
} as const;

export const ASTEROID = {
  radius: 14, // drawn size, about 29 px wide
  hitRadius: 12, // a little forgiving
  laneMin: 16, // lane center range
  laneMax: 56,
  spawnY: -30,
  despawnY: 160,
  firstSpawn: 2, // seconds into a run
  minGap: 14, // two lanes must leave at least this much free space
  pairChance: 0.35, // chance to drop two at once when allowed
  retryDelay: 0.25, // wait before retrying a blocked spawn
  shakeRange: 20, // shake while this close vertically to the rocket
  variants: [3, 7, 11, 19, 23, 31], // seeds for the generated sprites
  // Warning visuals
  blinkFrames: 8,
  blinkFramesUrgent: 4, // faster blink for the last part of the warning
  urgentAt: 0.6, // share of the warning time before the blink speeds up
} as const;

export const NEAR_MISS = {
  margin: 6, // px between the asteroid's hit circle and the rocket's hitbox (the drawn rock reaches ~2 px past the hit circle)
  points: 50,
  sparks: 10,
} as const;

export const SCORE = {
  perSecond: 10,
  maxShown: 9999,
} as const;

export interface DifficultyRow {
  t: number; // seconds into the run
  asteroidInterval: number;
  warnTime: number;
  fallSpeed: number;
  maxAsteroids: number;
  chickenInterval: number;
  flockMin: number;
  flockMax: number;
  chickenSpeed: number;
}

// Values are interpolated between rows; counts are rounded down.
export const DIFFICULTY: readonly DifficultyRow[] = [
  { t: 0, asteroidInterval: 4.0, warnTime: 1.5, fallSpeed: 190, maxAsteroids: 1, chickenInterval: 3.0, flockMin: 1, flockMax: 1, chickenSpeed: 36 },
  { t: 30, asteroidInterval: 3.2, warnTime: 1.3, fallSpeed: 200, maxAsteroids: 1, chickenInterval: 2.5, flockMin: 1, flockMax: 3, chickenSpeed: 42 },
  { t: 60, asteroidInterval: 2.6, warnTime: 1.1, fallSpeed: 215, maxAsteroids: 1, chickenInterval: 2.0, flockMin: 3, flockMax: 3, chickenSpeed: 48 },
  { t: 90, asteroidInterval: 2.2, warnTime: 0.95, fallSpeed: 225, maxAsteroids: 2, chickenInterval: 1.8, flockMin: 3, flockMax: 5, chickenSpeed: 54 },
  { t: 120, asteroidInterval: 1.8, warnTime: 0.8, fallSpeed: 240, maxAsteroids: 2, chickenInterval: 1.5, flockMin: 5, flockMax: 5, chickenSpeed: 60 },
];

export const PARTICLES = {
  max: 200,
  gravity: 144, // px/s²
} as const;

export const POPUP = {
  rise: 15, // px
  duration: 0.8, // s
} as const;

export const DEATH = {
  duration: 1.2, // s before the run restarts (game over screen comes in M5)
  shake: 2,
  shakeTime: 0.3,
  lifeMin: 1,
  lifeMax: 1.7,
} as const;

export const CHICKEN = {
  w: 11,
  h: 9,
  hitboxInset: 1,
  descent: 1, // vy / vx: flocks dive at 45°, so each chicken crosses the rocket's row at one spot
  aimChance: 0.5, // chance a flock dives at where the rocket is now
  firstSpawn: 4, // seconds into a run
  speedJitter: 0.15, // ± share of the difficulty speed
  trail: 12, // V formation: distance behind the leader along the flight path, per row
  spread: 2.5, // ... and sideways, per row (wide Vs would wall off the screen)
  flapFrames: 8,
  tumbleFlapFrames: 4,
  tumbleVx: 78, // px/s away from the rocket after a hit
  tumbleVy: -96,
  feathers: 12,
} as const;

export const REVERSE = {
  duration: 2.5, // restarts on every new hit
  shake: 2, // rocket wobble in px
  shakeTime: 0.5,
  dizzyPixels: 3,
} as const;

export const EGGS = {
  max: 3, // a full set is fatal
  decay: 8, // seconds without a hit to empty one egg
  immunity: 0.5, // no new chicken hits for this long after one
  doomTime: 0.5, // eggs blink this long before the rocket explodes
} as const;

export const SCREENS = {
  title: ['GET2', 'MARS'], // first line cream, second orange
  titleBob: 3, // px the big rocket floats up and down
  blinkTime: 0.5, // s on / s off for "TAP" and "NEW BEST"
  retryLockout: 0.5, // ignore taps this long after game over appears
  bestKey: 'get2mars.best',
} as const;

export const AUDIO = {
  volume: 0.6, // master
  musicVolume: 0.5, // relative to master
  bpm: 140, // music tempo at the start of a run
  tempoRise: 0.15, // music gets this much faster by 120 s
  mutedKey: 'get2mars.muted',
} as const;

// Mute toggle on the title and game over screens; the tap area is bigger than the icon.
export const MUTE_BUTTON = {
  x: 62, // icon top-left
  y: 3,
  hitX: 52, // taps right of this and above hitY toggle mute
  hitY: 16,
} as const;

export type PowerKind = 'shield' | 'slow' | 'eggs';

export const POWERUP = {
  size: 9,
  firstSpawn: 12, // seconds into a run
  intervalMin: 12,
  intervalMax: 20,
  fallSpeed: 40, // px/s
  xMin: 4, // left edge range
  xMax: 59,
  laneClear: 18, // keep this far from lanes with an asteroid warning
  eggsChance: 0.5, // chance of an egg reset when you have eggs
  shieldTime: 10, // s, or until an asteroid pops it
  slowTime: 5,
  slowFactor: 0.5, // world speed while slowed; the rocket stays at full speed
  shieldRadius: 10,
  shieldDots: 10,
  expiryBlink: 2, // the effect blinks for its last seconds
  bounceFeathers: 6,
  popSparks: 24,
  colorSwapFrames: 16, // pickups swap their two colors this often
} as const;
