import { EGGS, HUD, PALETTE, SCORE, VIEW } from './config';
import { EGG_EMPTY, EGG_FULL, makeSprite, SWAP_MAP } from './sprites';

const EGG_ON = makeSprite(EGG_FULL, { X: PALETTE.detail });
// Empty eggs are outlined in the bar's text color, which flips while reversed.
const EGG_OFF = makeSprite(EGG_EMPTY, { X: PALETTE.rocket });
const EGG_OFF_REVERSED = makeSprite(EGG_EMPTY, { X: PALETTE.bg });
const SWAP = makeSprite(SWAP_MAP, { X: PALETTE.detail });

const SWAP_X = 40; // between the score and the eggs
const EGG_X = 51;
const EGG_STEP = 7;
const ICON_Y = 5;

export interface HudState {
  score: number;
  eggs: number;
  reversed: boolean;
  eggsBlink: boolean;
  frame: number;
}

export function renderHud(ctx: CanvasRenderingContext2D, s: HudState): void {
  // The bar inverts (cream bar, navy text) while controls are reversed.
  const bar = s.reversed ? PALETTE.rocket : PALETTE.bg;
  const text = s.reversed ? PALETTE.bg : PALETTE.rocket;
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

  if (s.reversed && Math.floor(s.frame / 8) % 2 === 0) ctx.drawImage(SWAP, SWAP_X, ICON_Y - 1);

  if (s.eggsBlink && Math.floor(s.frame / 4) % 2) return;
  const empty = s.reversed ? EGG_OFF_REVERSED : EGG_OFF;
  for (let i = 0; i < EGGS.max; i++) {
    ctx.drawImage(i < s.eggs ? EGG_ON : empty, EGG_X + i * EGG_STEP, ICON_Y);
  }
}
