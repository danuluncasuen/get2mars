import '@fontsource/press-start-2p/latin-400.css';
import { HITCH, HUD, MAX_FRAME, STEP, TESTING } from './config';
import { Sound } from './audio';
import { Display } from './display';
import { Game } from './game';
import { Input } from './input';
import { lastBuzz } from './haptics';
import { ALL_SPRITES } from './sprites';

const DEBUG = new URLSearchParams(location.search).has('debug');

const screen = document.getElementById('screen') as HTMLCanvasElement;
const display = new Display(screen);
const input = new Input(screen, display);
const sound = new Sound();
const game = new Game(input, sound, DEBUG);
// Handy for poking at state from the browser console.
if (DEBUG) Object.assign(window, { game, display, sound });

// Audio may only start inside a user gesture; every tap or key press makes sure it's running.
screen.addEventListener('pointerdown', () => sound.unlock());
window.addEventListener('keydown', () => sound.unlock());

// Fixed-timestep loop: simulate in 1/60 s steps, render once per animation frame.
let last = performance.now();
let acc = 0;
let running = true;

// Test builds log every slow frame with where the time went, for chasing lag on the phone
// (the iOS app forwards console output to Xcode / devicectl --console).
const LAG_LOG = TESTING.unlockScale !== 1;
let lastWork = 0; // ms spent in update + render + present on the previous frame

// iOS reports frame times rounded to 1 ms, so 60 Hz frames arrive as 16 or 17 ms, never 16.67.
// Fed straight into the fixed step, a 16 ms frame falls just short of a step: the game freezes
// for a frame, then jumps two steps on the next, a judder across the whole screen. Gaps within a
// few ms of a whole number of steps count as exactly that many (a dropped frame still counts as 2).
const STEP_MS = STEP * 1000;
function steadyGap(gap: number): number {
  const steps = Math.round(gap / STEP_MS);
  return steps >= 1 && Math.abs(gap - steps * STEP_MS) < 4 ? steps * STEP_MS : gap;
}

function loop(now: number): void {
  if (!running) return;
  const gap = now - last;
  game.noteFrame(gap);
  acc += Math.min(MAX_FRAME, steadyGap(gap) / 1000);
  last = now;
  const t0 = performance.now();
  let steps = 0;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
    steps++;
  }
  const t1 = performance.now();
  game.render(display.ctx);
  const t2 = performance.now();
  const shake = game.shake.offset();
  display.present(shake.x, shake.y);
  const t3 = performance.now();
  if (LAG_LOG && gap > HITCH.logMs && game.inRun) {
    const f = (ms: number) => ms.toFixed(1);
    console.log(
      `[lag] gap ${f(gap)} | prev work ${f(lastWork)} | now: update ${f(t1 - t0)} (${steps} steps) render ${f(t2 - t1)} present ${f(t3 - t2)} | buzz ${lastBuzz.kind || '-'} ${f(now - lastBuzz.at)}ms ago | sound ${sound.lastPlayed.name || '-'} ${f(now - sound.lastPlayed.at)}ms ago | ${game.lagContext()}`,
    );
  }
  lastWork = t3 - t0;
  requestAnimationFrame(loop);
}

// Leaving the app (or the window, on desktop) pauses the run so nothing is lost meanwhile.
window.addEventListener('blur', () => game.pauseGame());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pauseGame();
  running = !document.hidden;
  if (running) {
    last = performance.now();
    acc = 0;
    requestAnimationFrame(loop);
  }
});

// The first time a sprite or a letter is drawn, the phone has to upload or rasterize it, which
// can stall that frame (it showed up as a hitch when new chickens and their names appeared).
// Drawing everything once up front, under the first real frame, gets that out of the way.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-!';
function warmUp(): void {
  const ctx = display.ctx;
  for (const s of ALL_SPRITES) ctx.drawImage(s, 0, 0);
  for (const font of [HUD.font, "16px 'Press Start 2P'"]) {
    ctx.font = font;
    ctx.fillText(GLYPHS, 0, 16);
  }
}
warmUp();

// The font ships with the app, but canvas-only fonts aren't always fetched on their own; text switches over once this resolves.
document.fonts.load(HUD.font).then(warmUp).catch(() => {});

requestAnimationFrame(loop);
