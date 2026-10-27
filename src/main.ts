import '@fontsource/press-start-2p/latin-400.css';
import { HUD, MAX_FRAME, STEP } from './config';
import { Sound } from './audio';
import { Display } from './display';
import { Game } from './game';
import { Input } from './input';

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

function loop(now: number): void {
  if (!running) return;
  acc += Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  game.render(display.ctx);
  const shake = game.shake.offset();
  display.present(shake.x, shake.y);
  requestAnimationFrame(loop);
}

document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  if (running) {
    last = performance.now();
    acc = 0;
    requestAnimationFrame(loop);
  }
});

// The font ships with the app, but canvas-only fonts aren't always fetched on their own; text switches over once this resolves.
document.fonts.load(HUD.font).catch(() => {});

requestAnimationFrame(loop);
