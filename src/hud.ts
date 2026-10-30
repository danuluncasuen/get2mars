import { HUD, LIVES, PALETTE, SCORE, VIEW } from './config';
import { FEATHER_MAP, HEART_EMPTY, HEART_FULL, makeSprite, SWAP_MAP } from './sprites';

const HEART_ON = makeSprite(HEART_FULL, { X: PALETTE.detail });
// Lost hearts are outlined in the bar's text color, which flips while an effect is on.
const HEART_OFF = makeSprite(HEART_EMPTY, { X: PALETTE.rocket });
const HEART_OFF_INVERTED = makeSprite(HEART_EMPTY, { X: PALETTE.bg });
const SWAP = makeSprite(SWAP_MAP, { X: PALETTE.detail });
const FEATHER = makeSprite(FEATHER_MAP, { X: PALETTE.detail });

// Score fills x 3–34; the effect icon and three hearts share the rest.
const SWAP_X = 40;
const HEART_X = 51; // hearts are 5 px wide with a 2 px gap, ending at x 69
const HEART_STEP = 7;
const ICON_Y = 5;

export interface HudState {
  score: number;
  hits: number; // hearts lost
  reversed: boolean;
  dazed: boolean;
  heartsBlink: boolean;
  frame: number;
}

export function renderHud(ctx: CanvasRenderingContext2D, s: HudState): void {
  // The bar inverts (cream bar, navy text) while the rocket is dazed or reversed.
  const affected = s.reversed || s.dazed;
  const bar = affected ? PALETTE.rocket : PALETTE.bg;
  const text = affected ? PALETTE.bg : PALETTE.rocket;
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, VIEW.w, HUD.barHeight);
  ctx.fillStyle = PALETTE.detail;
  ctx.fillRect(0, HUD.barHeight, VIEW.w, 1);

  ctx.font = HUD.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = text;
  const shown = Math.min(SCORE.maxShown, Math.floor(s.score));
  ctx.fillText(String(shown).padStart(4, '0'), 3, 12);

  // Blinking icon for the effect; with both on, they take turns.
  if (affected && Math.floor(s.frame / 8) % 2 === 0) {
    const showSwap = s.reversed && (!s.dazed || Math.floor(s.frame / 32) % 2 === 0);
    ctx.drawImage(showSwap ? SWAP : FEATHER, SWAP_X, ICON_Y - 1);
  }

  if (s.heartsBlink && Math.floor(s.frame / 4) % 2) return;
  const empty = affected ? HEART_OFF_INVERTED : HEART_OFF;
  // Hearts left stay full from the left; lost ones empty from the right.
  for (let i = 0; i < LIVES.max; i++) {
    ctx.drawImage(i < LIVES.max - s.hits ? HEART_ON : empty, HEART_X + i * HEART_STEP, ICON_Y);
  }
}
