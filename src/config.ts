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
  startY: 112, // top of the sprite at the start of a run
  yMin: 72, // the rocket flies anywhere in the lower half
  yMax: 124,
  fingerOffset: 0, // px the rocket's center sits above the finger (8 and 16 both felt too far)
  maxSpeed: 300, // px/s when following a finger
  follow: 0.35, // fraction of the gap to the finger closed per 1/60 s
  keySpeed: 140, // px/s with the arrow keys
  dazedFlameFrames: 3, // flame sputters this fast while dazed
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
// Asteroid intervals are ~38% longer than the original spec, leaving room to ramp up later.
export const DIFFICULTY: readonly DifficultyRow[] = [
  { t: 0, asteroidInterval: 5.5, warnTime: 1.5, fallSpeed: 190, maxAsteroids: 1, chickenInterval: 3.0, flockMin: 1, flockMax: 1, chickenSpeed: 36 },
  { t: 30, asteroidInterval: 4.4, warnTime: 1.3, fallSpeed: 200, maxAsteroids: 1, chickenInterval: 2.5, flockMin: 1, flockMax: 3, chickenSpeed: 42 },
  { t: 60, asteroidInterval: 3.6, warnTime: 1.1, fallSpeed: 215, maxAsteroids: 1, chickenInterval: 2.0, flockMin: 3, flockMax: 3, chickenSpeed: 48 },
  { t: 90, asteroidInterval: 3.0, warnTime: 0.95, fallSpeed: 225, maxAsteroids: 2, chickenInterval: 1.8, flockMin: 3, flockMax: 5, chickenSpeed: 54 },
  { t: 120, asteroidInterval: 2.5, warnTime: 0.8, fallSpeed: 240, maxAsteroids: 2, chickenInterval: 1.5, flockMin: 5, flockMax: 5, chickenSpeed: 60 },
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

// Chicken hit: the rocket is dazed and flies slow. A new hit restarts the timer.
export const DAZE = {
  duration: 2.5,
  speed: 0.4, // share of normal speed and responsiveness
  shake: 2, // rocket wobble in px
  shakeTime: 0.5,
} as const;

// Orange egg hit: left and right swap.
export const REVERSE = {
  duration: 3,
  dizzyPixels: 3,
} as const;

// Testing aid. unlockScale multiplies every UNLOCK time: 1 for release, lower brings
// everything sooner (0.2: stars at 2 s, eggs at 18 s). Anything but 1 shows "TEST" on the title.
export const TESTING: { readonly unlockScale: number } = {
  unlockScale: 0.2,
};

// New threats and toys arrive one at a time, so every run reveals more as it goes.
export const UNLOCK = {
  stars: 10, // seconds into a run
  bouncers: 25,
  divers: 45,
  eggLayers: 90,
} as const;

export const UNLOCK_NAMES: Record<keyof typeof UNLOCK, string> = {
  stars: 'STARS',
  bouncers: 'BOUNCE',
  divers: 'DIVE',
  eggLayers: 'EGGS',
};

// Lines of small stars that sway across lanes: +10 each, +50 for the whole line.
export const STAR_TRAIL = {
  intervalMin: 6,
  intervalMax: 10,
  countMin: 6,
  countMax: 9,
  spacing: 9, // px between stars
  fallSpeed: 55, // px/s
  amplitudeMin: 10, // sway, px
  amplitudeMax: 22,
  sway: 0.55, // radians of the sway curve per star
  points: 10,
  perfectBonus: 50,
  size: 3,
  twinkleFrames: 20,
} as const;

// Some chickens bounce off the screen edges instead of flying out, so edges aren't safe.
export const BOUNCER = {
  chance: 0.35, // share of spawns that are a single bouncer
  bounces: 2,
} as const;

// Divers hover at the top flapping hard (the warning), then dive at where the rocket is.
export const DIVER = {
  intervalMin: 6,
  intervalMax: 10,
  hoverY: 19,
  enterSpeed: 60, // px/s dropping in to the hover spot
  hoverTime: 1.1,
  speed: 130, // px/s once diving
  flapFrames: 3,
} as const;

// Late chickens carry an egg and drop it over the play area.
export const EGG_DROP = {
  layerChance: 0.35, // share of chickens that carry an egg once unlocked
  delayMin: 0.15, // s on screen before dropping
  delayMax: 0.6,
  lastChance: 6, // px above the rocket's band where a carrier drops its egg regardless
  fallSpeed: 70,
  w: 4,
  h: 5,
  reverseChance: 0.45, // orange egg: reversed controls
  goldenChance: 0.1, // golden egg: a prize
  goldenPoints: 200,
  goldenPowerChance: 0.5, // otherwise a random power-up
  goldenBlinkFrames: 6,
  breakBits: 8,
} as const;

// Cream egg hit: a yolk splat covers part of the screen, then breaks up.
export const YOLK = {
  duration: 3,
  fadeTime: 1, // the last part of the duration, spent dissolving
  radius: 15,
  yolkRadius: 5,
  xMin: 14, // splat center range
  xMax: 58,
  yMin: 40,
  yMax: 92,
  drips: 3,
  dripSpeed: 8, // px/s
} as const;

export const EGGS = {
  max: 5, // strike eggs; a full set is fatal
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

export type PowerKind = 'shield' | 'time' | 'eggs';

export const POWERUP = {
  size: 9,
  firstSpawn: 12, // seconds into a run
  intervalMin: 12,
  intervalMax: 20,
  fallSpeed: 40, // px/s
  xMin: 4, // left edge range
  xMax: 59,
  laneClear: 18, // keep this far from lanes with an asteroid warning
  eggsChance: 0.5, // chance of a CLEAR when you have eggs or an effect on you
  shieldTime: 10, // s, or until an asteroid pops it
  timeTime: 5, // TIME: the world runs slow
  timeFactor: 0.5, // world speed during TIME; the rocket stays at full speed
  shieldRadius: 10,
  shieldDots: 10,
  expiryBlink: 2, // the effect blinks for its last seconds
  bounceFeathers: 6,
  popSparks: 24,
  colorSwapFrames: 16, // pickups swap their two colors this often
} as const;
