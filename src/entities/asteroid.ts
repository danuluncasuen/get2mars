import { ASTEROID, HUD, PALETTE, VIEW } from '../config';
import { CHEVRON_MAP, DETAIL_COLORS, makeAsteroid, makeSprite, WARNING_MAP } from '../sprites';

const SPRITES = ASTEROID.variants.map((seed) => makeAsteroid(ASTEROID.radius, seed));
const WARNING = makeSprite(WARNING_MAP, DETAIL_COLORS);
const CHEVRON = makeSprite(CHEVRON_MAP, DETAIL_COLORS);
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

  private renderWarning(ctx: CanvasRenderingContext2D): void {
    const f = Math.floor(this.elapsed * 60);
    const top = HUD.playTop;
    const left = Math.round(this.cx - ASTEROID.radius);
    const right = Math.round(this.cx + ASTEROID.radius);

    // Dashed lane edges and the "!" icon blink together.
    if (Math.floor(f / ASTEROID.blinkFrames) % 2 === 0) {
      ctx.fillStyle = PALETTE.detail;
      const scroll = f % ASTEROID.dashEvery;
      for (let y = top - ASTEROID.dashEvery + scroll; y < VIEW.h; y += ASTEROID.dashEvery) {
        const y0 = Math.max(top, y);
        const h = y + ASTEROID.dashLength - y0;
        if (h <= 0) continue;
        ctx.fillRect(left, y0, 1, h);
        ctx.fillRect(right, y0, 1, h);
      }
      ctx.drawImage(WARNING, Math.round(this.cx - WARNING.width / 2), top + 2);
    }

    // Chevrons keep scrolling down the lane.
    const span = ASTEROID.chevrons * ASTEROID.chevronSpacing;
    for (let i = 0; i < ASTEROID.chevrons; i++) {
      const y = top + 13 + ((f / 2 + i * ASTEROID.chevronSpacing) % span);
      ctx.drawImage(CHEVRON, Math.round(this.cx - CHEVRON.width / 2), Math.floor(y));
    }
  }
}
