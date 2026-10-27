import { ASTEROID, HUD } from '../config';
import { DETAIL_COLORS, makeAsteroid, makeSprite, WARNING_MAP } from '../sprites';

const SPRITES = ASTEROID.variants.map((seed) => makeAsteroid(ASTEROID.radius, seed));
const WARNING = makeSprite(WARNING_MAP, DETAIL_COLORS);
let nextVariant = 0;

// Flashes a warning down its lane, then drops straight through it.
export class Asteroid {
  phase: 'warning' | 'falling' = 'warning';
  y: number = ASTEROID.spawnY; // top of the sprite
  grazed = false; // came within the near-miss margin
  nearMissed = false; // bonus already paid
  dead = false;
  private elapsed = 0;
  private readonly sprite = SPRITES[nextVariant++ % SPRITES.length];

  constructor(
    readonly cx: number,
    private readonly warnTime: number,
    private readonly speed: number,
  ) {}

  get centerY(): number {
    return this.y + this.sprite.height / 2;
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.phase === 'warning') {
      if (this.elapsed >= this.warnTime) this.phase = 'falling';
      return;
    }
    this.y += this.speed * dt;
    if (this.y > ASTEROID.despawnY) this.dead = true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'warning') this.renderWarning(ctx);
    else ctx.drawImage(this.sprite, Math.round(this.cx - this.sprite.width / 2), Math.round(this.y));
  }

  // Just a "!" at the top of the lane, blinking faster as the drop gets close.
  private renderWarning(ctx: CanvasRenderingContext2D): void {
    const f = Math.floor(this.elapsed * 60);
    const urgent = this.elapsed > this.warnTime * ASTEROID.urgentAt;
    const blink = urgent ? ASTEROID.blinkFramesUrgent : ASTEROID.blinkFrames;
    if (Math.floor(f / blink) % 2) return;
    ctx.drawImage(WARNING, Math.round(this.cx - WARNING.width / 2), HUD.playTop + 2);
  }
}
