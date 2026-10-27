import { PALETTE, VIEW } from './config';

// Draws the game on a tiny offscreen canvas, then blits it to the screen at the
// largest integer scale that fits, centered on a navy letterbox.
export class Display {
  readonly ctx: CanvasRenderingContext2D;
  private readonly screen: HTMLCanvasElement;
  private readonly screenCtx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;

  constructor(screen: HTMLCanvasElement) {
    this.screen = screen;
    this.screenCtx = screen.getContext('2d')!;
    this.buffer = document.createElement('canvas');
    this.buffer.width = VIEW.w;
    this.buffer.height = VIEW.h;
    this.ctx = this.buffer.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.screen.getBoundingClientRect();
    const w = Math.round(rect.width * this.dpr);
    const h = Math.round(rect.height * this.dpr);
    this.screen.width = w;
    this.screen.height = h;
    this.scale = Math.max(1, Math.floor(Math.min(w / VIEW.w, h / VIEW.h)));
    this.offsetX = Math.floor((w - VIEW.w * this.scale) / 2);
    this.offsetY = Math.floor((h - VIEW.h * this.scale) / 2);
    this.screenCtx.imageSmoothingEnabled = false;
  }

  present(shakeX = 0, shakeY = 0): void {
    const c = this.screenCtx;
    c.fillStyle = PALETTE.bg;
    c.fillRect(0, 0, this.screen.width, this.screen.height);
    c.drawImage(
      this.buffer,
      this.offsetX + shakeX * this.scale,
      this.offsetY + shakeY * this.scale,
      VIEW.w * this.scale,
      VIEW.h * this.scale,
    );
  }

  // Converts a pointer position (CSS pixels) to logical game pixels.
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.screen.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * this.dpr - this.offsetX) / this.scale,
      y: ((clientY - rect.top) * this.dpr - this.offsetY) / this.scale,
    };
  }
}
