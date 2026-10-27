import { HUD, PALETTE, POPUP, VIEW } from '../config';

interface Popup {
  text: string;
  x: number;
  y: number;
  age: number;
}

// Floating score text: rises, then blinks out.
export class Popups {
  private list: Popup[] = [];

  add(text: string, x: number, y: number): void {
    this.list.push({ text, x, y, age: 0 });
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    for (const p of this.list) p.age += dt;
    this.list = this.list.filter((p) => p.age < POPUP.duration);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.font = HUD.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.detail;
    for (const p of this.list) {
      const k = p.age / POPUP.duration;
      if (k > 0.6 && Math.floor(p.age * 15) % 2) continue;
      const w = ctx.measureText(p.text).width;
      const x = Math.max(0, Math.min(VIEW.w - w, p.x));
      ctx.fillText(p.text, Math.round(x), Math.round(p.y - POPUP.rise * k));
    }
  }
}
