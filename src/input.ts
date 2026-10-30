import type { Display } from './display';

// Tracks where the player wants the rocket: a finger/mouse position, or held arrow keys.
export class Input {
  // Logical position of the finger while dragging, otherwise null.
  pointerX: number | null = null;
  pointerY: number | null = null;
  // -1, 0 or 1 from the arrow keys: left/right and up/down.
  keyDir = 0;
  keyDirY = 0;
  // Logical position of the latest unread tap; keyboard taps have no position.
  private tap: { x: number; y: number } | null = null;
  private muteKey = false;
  private pauseKey = false;
  private readonly keys = new Set<string>();

  constructor(target: HTMLElement, display: Display) {
    const move = (e: PointerEvent) => {
      const p = display.toLogical(e.clientX, e.clientY);
      this.pointerX = p.x;
      this.pointerY = p.y;
    };
    target.addEventListener('pointerdown', (e) => {
      target.setPointerCapture(e.pointerId);
      this.tap = display.toLogical(e.clientX, e.clientY);
      move(e);
    });
    target.addEventListener('pointermove', (e) => {
      if (e.buttons || e.pointerType === 'touch') move(e);
    });
    const release = () => {
      this.pointerX = null;
      this.pointerY = null;
    };
    target.addEventListener('pointerup', release);
    target.addEventListener('pointercancel', release);
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (e.key.startsWith('Arrow')) {
        this.keys.add(e.key);
        e.preventDefault();
      }
      if (e.key === ' ' || e.key === 'Enter') this.tap = { x: -1, y: -1 };
      if (e.key === 'm' || e.key === 'M') this.muteKey = true;
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.pauseKey = true;
      this.updateKeyDir();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
      this.updateKeyDir();
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointerX = null;
      this.pointerY = null;
      this.updateKeyDir();
    });
  }

  // The latest tap, once; used by screens to advance.
  consumeTap(): { x: number; y: number } | null {
    const t = this.tap;
    this.tap = null;
    return t;
  }

  // True once after M is pressed.
  consumeMuteKey(): boolean {
    const m = this.muteKey;
    this.muteKey = false;
    return m;
  }

  // True once after P or Esc is pressed.
  consumePauseKey(): boolean {
    const p = this.pauseKey;
    this.pauseKey = false;
    return p;
  }

  private updateKeyDir(): void {
    this.keyDir = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    this.keyDirY = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
  }
}
