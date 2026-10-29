import { EGGS, HUD, PALETTE, SCORE, VIEW } from './config';
import { EGG_EMPTY, EGG_FULL, FEATHER_MAP, makeSprite, SWAP_MAP } from './sprites';

const EGG_ON = makeSprite(EGG_FULL, { X: PALETTE.detail });
// Empty eggs are outlined in the bar's text color, which flips while an effect is on.
const EGG_OFF = makeSprite(EGG_EMPTY, { X: PALETTE.rocket });
const EGG_OFF_REVERSED = makeSprite(EGG_EMPTY, { X: PALETTE.bg });
const SWAP = makeSprite(SWAP_MAP, { X: PALETTE.detail });
const FEATHER = makeSprite(FEATHER_MAP, { X: PALETTE.detail });

// Score fills x 3–34; the effect icon and five eggs share the rest.
const SWAP_X = 37;
const EGG_X = 46; // eggs are 4 px wide with a 1 px gap, ending at x 69
const EGG_STEP = 5;
const ICON_Y = 5;

export interface HudState {
  score: number;
  eggs: number;
  reversed: boolean;
  dazed: boolean;
  eggsBlink: boolean;
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

  if (s.eggsBlink && Math.floor(s.frame / 4) % 2) return;
  const empty = affected ? EGG_OFF_REVERSED : EGG_OFF;
  for (let i = 0; i < EGGS.max; i++) {
    ctx.drawImage(i < s.eggs ? EGG_ON : empty, EGG_X + i * EGG_STEP, ICON_Y);
  }
}
