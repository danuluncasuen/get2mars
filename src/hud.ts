import { HUD, LIVES, PALETTE, SCORE, VIEW } from './config';
import { FEATHER_MAP, HEART_EMPTY, HEART_FULL, makeSprite } from './sprites';

const HEART_ON = makeSprite(HEART_FULL, { X: PALETTE.detail });
// Lost hearts are outlined in the bar's text color, which flips while an effect is on.
const HEART_OFF = makeSprite(HEART_EMPTY, { X: PALETTE.rocket });
const HEART_OFF_INVERTED = makeSprite(HEART_EMPTY, { X: PALETTE.bg });
const FEATHER = makeSprite(FEATHER_MAP, { X: PALETTE.detail });

// One row, left to right: pause 2–7, score 11–41, effect icon 43–49, hearts 52–68.
// A five-digit score runs to 50, over the icon's spot.
const PAUSE_X = 2; // two 2 px bars with a 2 px gap
const SCORE_X = 11;
const ICON_X = 43;
const HEART_X = 52; // hearts are 5 px wide with a 1 px gap
const HEART_STEP = 6;
const ICON_Y = 6; // 5 px icons centered on the 7 px digits (y 5–11)

export interface HudState {
  score: number;
  hits: number; // hearts lost
  dazed: boolean;
  heartsBlink: boolean;
  lostBlink: boolean; // the heart just lost flickers while true
  frame: number;
}

export function renderHud(ctx: CanvasRenderingContext2D, s: HudState): void {
  // The bar inverts (cream bar, navy text) while the rocket is dazed.
  const affected = s.dazed;
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
  const digits = String(shown).padStart(4, '0');
  ctx.fillText(digits, SCORE_X, 12);
  // The whole bar is the pause button; two bars, as tall as the hearts, mark it.
  ctx.fillRect(PAUSE_X, ICON_Y, 2, 5);
  ctx.fillRect(PAUSE_X + 4, ICON_Y, 2, 5);

  // Blinking feather while dazed, if the score leaves room (the bar still inverts).
  if (affected && digits.length <= 4 && Math.floor(s.frame / 8) % 2 === 0) ctx.drawImage(FEATHER, ICON_X, ICON_Y - 1);

  if (s.heartsBlink && Math.floor(s.frame / 4) % 2) return;
  const empty = affected ? HEART_OFF_INVERTED : HEART_OFF;
  // Hearts left stay full from the left; lost ones empty from the right.
  for (let i = 0; i < LIVES.max; i++) {
    const lit = i < LIVES.max - s.hits || (s.lostBlink && i === LIVES.max - s.hits && Math.floor(s.frame / 4) % 2 === 0);
    ctx.drawImage(lit ? HEART_ON : empty, HEART_X + i * HEART_STEP, ICON_Y);
  }
}
