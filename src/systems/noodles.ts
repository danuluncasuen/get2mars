import { LIGHT_SPEED, VIEW } from '../config';
import type { Box } from '../entities/rocket';
import { snap } from '../pixel';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Noodle {
  x: number; // column it started on
  cx: number; // center of the thing it came from
  top: number;
  bottom: number;
  topSpeed: number;
  bottomSpeed: number;
  age: number;
  color: string;
}

// Spaghettification at light speed: each thing breaks into thin strands, which pinch in toward
// its center while their bottom ends race ahead of the tops, stretching it down the screen.
export class Noodles {
  private list: Noodle[] = [];

  add(box: Box, color: string): void {
    const cx = box.x + box.w / 2;
    for (let i = 0; i < box.w && this.list.length < LIGHT_SPEED.noodles; i += LIGHT_SPEED.noodleStep) {
      this.list.push({
        x: box.x + i,
        cx,
        top: box.y,
        bottom: box.y + box.h,
        topSpeed: rand(LIGHT_SPEED.topSpeedMin, LIGHT_SPEED.topSpeedMax),
        bottomSpeed: rand(LIGHT_SPEED.bottomSpeedMin, LIGHT_SPEED.bottomSpeedMax),
        age: 0,
        color,
      });
    }
  }

  clear(): void {
    this.list = [];
  }

  update(dt: number): void {
    if (!this.list.length) return;
    for (const n of this.list) {
      n.age += dt;
      n.topSpeed += LIGHT_SPEED.noodleAccel * dt;
      n.top += n.topSpeed * dt;
      n.bottom += n.bottomSpeed * dt;
    }
    this.list = this.list.filter((n) => n.top < VIEW.h);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const n of this.list) {
      const k = Math.min(1, n.age / LIGHT_SPEED.pinchTime);
      const x = n.x + (n.cx - n.x) * k * LIGHT_SPEED.pinch;
      const top = snap(n.top);
      ctx.fillStyle = n.color;
      ctx.fillRect(snap(x), top, 1, snap(n.bottom) - top);
    }
  }
}
