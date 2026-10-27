// Screen shake in whole logical pixels.
export class Shake {
  private magnitude = 0;
  private time = 0;

  add(magnitude: number, duration: number): void {
    this.magnitude = Math.max(this.time > 0 ? this.magnitude : 0, magnitude);
    this.time = Math.max(this.time, duration);
  }

  clear(): void {
    this.magnitude = 0;
    this.time = 0;
  }

  update(dt: number): void {
    this.time = Math.max(0, this.time - dt);
    if (this.time === 0) this.magnitude = 0;
  }

  offset(): { x: number; y: number } {
    if (this.time === 0) return { x: 0, y: 0 };
    const r = () => Math.round((Math.random() * 2 - 1) * this.magnitude);
    return { x: r(), y: r() };
  }
}
