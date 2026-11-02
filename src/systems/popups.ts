import { HUD, PALETTE, POPUP, VIEW } from '../config';
import { snap } from '../pixel';

interface Popup {
  text: string;
  x: number;
  y: number;
  age: number;
  color: string;
  life: number; // s on screen
}

// Floating text: rises, then blinks out. Cream for good news, orange for a new threat.
export class Popups {
  private list: Popup[] = [];

  add(text: string, x: number, y: number, color: string = PALETTE.rocket, life: number = POPUP.duration): void {
    this.list.push({ text, x, y, age: 0, color, life });
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    for (const p of this.list) p.age += dt;
    this.list = this.list.filter((p) => p.age < p.life);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.font = HUD.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const p of this.list) {
      ctx.fillStyle = p.color;
      const k = p.age / p.life;
      if (k > 0.6 && Math.floor(p.age * 15) % 2) continue;
      const w = ctx.measureText(p.text).width;
      const x = Math.max(0, Math.min(VIEW.w - w, p.x));
      // Long-lived popups (ranks) rise the same distance, just slower.
      ctx.fillText(p.text, Math.round(x), snap(p.y - POPUP.rise * k));
    }
  }
}
