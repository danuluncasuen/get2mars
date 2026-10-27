import { HUD, MUTE_BUTTON, PALETTE, ROCKET, SCORE, SCREENS, VIEW } from './config';
import type { DeathCause } from './game';
import { makeSprite, ROCKET_COLORS, ROCKET_MAP, SPEAKER_MAP, SPEAKER_MUTED_MAP } from './sprites';

const ROCKET_SPRITE = makeSprite(ROCKET_MAP, ROCKET_COLORS);
const SPEAKER = makeSprite(SPEAKER_MAP, { X: PALETTE.rocket });
const SPEAKER_MUTED = makeSprite(SPEAKER_MUTED_MAP, { X: PALETTE.detail });

function renderMute(ctx: CanvasRenderingContext2D, muted: boolean): void {
  ctx.drawImage(muted ? SPEAKER_MUTED : SPEAKER, MUTE_BUTTON.x, MUTE_BUTTON.y);
}
const MID = VIEW.w / 2;

function text(ctx: CanvasRenderingContext2D, s: string, y: number, color: string): void {
  ctx.font = HUD.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(s, MID, y);
}

const pad = (n: number) => String(Math.min(SCORE.maxShown, Math.floor(n))).padStart(4, '0');
const blinkOn = (time: number) => Math.floor(time / SCREENS.blinkTime) % 2 === 0;

// time: seconds the screen has been showing.
export function renderTitle(ctx: CanvasRenderingContext2D, time: number, best: number, muted: boolean): void {
  renderMute(ctx, muted);
  text(ctx, SCREENS.title[0], 30, PALETTE.rocket);
  text(ctx, SCREENS.title[1], 42, PALETTE.detail);

  // Big rocket at 2x, gently bobbing, with a 2x flickering flame.
  const s = 2;
  const x = Math.round(MID - (ROCKET.w * s) / 2);
  const y = 60 + Math.round(Math.sin(time * 4) * SCREENS.titleBob);
  const long = Math.floor((time * 60) / ROCKET.flameToggleFrames) % 2 === 1;
  const len = long ? 4 : 2;
  ctx.fillStyle = PALETTE.detail;
  ctx.fillRect(x + 3 * s, y + 12 * s, 3 * s, len * s);
  ctx.fillRect(x + 4 * s, y + (12 + len) * s, s, 2 * s);
  ctx.drawImage(ROCKET_SPRITE, x, y, ROCKET.w * s, ROCKET.h * s);

  if (best > 0) {
    text(ctx, 'BEST', 112, PALETTE.detail);
    text(ctx, pad(best), 122, PALETTE.rocket);
  }
  if (blinkOn(time)) text(ctx, 'TAP', 138, PALETTE.rocket);
}

export interface GameOverInfo {
  score: number;
  best: number;
  newBest: boolean;
  cause: DeathCause;
  time: number; // seconds the screen has been showing
  muted: boolean;
}

export function renderGameOver(ctx: CanvasRenderingContext2D, g: GameOverInfo): void {
  renderMute(ctx, g.muted);
  if (g.cause === 'chicken') {
    text(ctx, 'FOWL', 34, PALETTE.detail);
    text(ctx, 'PLAY', 46, PALETTE.rocket);
  } else {
    text(ctx, 'GAME', 34, PALETTE.detail);
    text(ctx, 'OVER', 46, PALETTE.detail);
  }

  text(ctx, pad(g.score), 70, PALETTE.rocket);
  if (g.newBest) {
    if (blinkOn(g.time)) text(ctx, 'NEW BEST', 84, PALETTE.detail);
  } else {
    text(ctx, 'BEST', 92, PALETTE.detail);
    text(ctx, pad(g.best), 102, PALETTE.rocket);
  }

  // Cream retry button with navy text.
  ctx.fillStyle = PALETTE.rocket;
  ctx.fillRect(12, 116, 48, 14);
  text(ctx, 'RETRY', 127, PALETTE.bg);
}
