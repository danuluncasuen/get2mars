import { CHICKEN, DIVER, EGG_DROP, HUD, ROCKET, VIEW } from '../config';
import { CHICKEN_A, CHICKEN_B, CHICKEN_COLORS, makeSprite } from '../sprites';
import type { Box } from './rocket';

// [wings up, wings down], one set per facing.
const RIGHT = [makeSprite(CHICKEN_A, CHICKEN_COLORS), makeSprite(CHICKEN_B, CHICKEN_COLORS)];
const LEFT = [makeSprite(CHICKEN_A, CHICKEN_COLORS, true), makeSprite(CHICKEN_B, CHICKEN_COLORS, true)];
const MARGIN = 40; // how far off screen a chicken may go before it is removed

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export interface ChickenOptions {
  bounces?: number; // times it turns back at a screen edge instead of flying out
  carriesEgg?: boolean;
}

// Dives diagonally across the screen; after hitting the rocket it tumbles away harmlessly.
// Divers start out hovering at the top, then dive once the game aims them.
export class Chicken {
  state: 'hovering' | 'flying' | 'tumbling' = 'flying';
  dead = false;
  hoverLeft = 0; // s of hovering left before a diver dives
  knocked = false; // bounced off the shield: worth points if it ends up in a black hole
  private dir: number;
  private age = 0;
  private bounces: number;
  private carriesEgg: boolean;
  private eggDelay = rand(EGG_DROP.delayMin, EGG_DROP.delayMax);
  private onScreenTime = 0;

  constructor(
    public x: number,
    public y: number,
    private vx: number,
    private vy: number,
    opts: ChickenOptions = {},
  ) {
    this.dir = Math.sign(vx) || 1;
    this.bounces = opts.bounces ?? 0;
    this.carriesEgg = opts.carriesEgg ?? false;
  }

  // A diver drops in from the top and hovers there.
  static diver(x: number, carriesEgg: boolean): Chicken {
    const c = new Chicken(x, -CHICKEN.h, 0, DIVER.enterSpeed, { carriesEgg });
    c.state = 'hovering';
    c.hoverLeft = DIVER.hoverTime;
    c.dir = Math.random() < 0.5 ? 1 : -1;
    return c;
  }

  get hitbox(): Box {
    const i = CHICKEN.hitboxInset;
    return { x: this.x + i, y: this.y + i, w: CHICKEN.w - i * 2, h: CHICKEN.h - i * 2 };
  }

  get bouncy(): boolean {
    return this.bounces > 0;
  }

  // Ends the hover and dives straight at (tx, ty), the rocket's center.
  dive(tx: number, ty: number): void {
    const dx = tx - (this.x + CHICKEN.w / 2);
    const dy = ty - (this.y + CHICKEN.h / 2);
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * DIVER.speed;
    this.vy = (dy / len) * DIVER.speed;
    if (Math.abs(dx) > 1) this.dir = Math.sign(dx);
    this.state = 'flying';
  }

  // away: -1 to tumble left, 1 to tumble right.
  tumble(away: number): void {
    this.state = 'tumbling';
    this.vx = away * CHICKEN.tumbleVx;
    this.vy = CHICKEN.tumbleVy;
    this.carriesEgg = false;
  }

  // Drags a tumbling chicken off course, e.g. toward a black hole. a: px/s², drag: share of speed lost per s.
  accelerate(ax: number, ay: number, drag: number, dt: number): void {
    const keep = Math.max(0, 1 - drag * dt);
    this.vx = (this.vx + ax * dt) * keep;
    this.vy = (this.vy + ay * dt) * keep;
  }

  // True once, when a carried egg should drop: a moment after the chicken shows up over the
  // play area, or right before it reaches the rocket's band, whichever comes first.
  dropEgg(): boolean {
    if (!this.carriesEgg || this.state === 'tumbling' || this.onScreenTime <= 0) return false;
    const bandTop = ROCKET.yMin - CHICKEN.h;
    if (this.y > bandTop) return false;
    if (this.onScreenTime < this.eggDelay && this.y < bandTop - EGG_DROP.lastChance) return false;
    this.carriesEgg = false;
    return true;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.state === 'hovering') {
      this.y = Math.min(DIVER.hoverY, this.y + this.vy * dt);
      this.hoverLeft -= dt;
      this.trackOnScreen(dt);
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bouncers turn back at the edges while they still have bounces left.
    if (this.state === 'flying' && this.bounces > 0) {
      const hitLeft = this.vx < 0 && this.x <= 0;
      const hitRight = this.vx > 0 && this.x >= VIEW.w - CHICKEN.w;
      if (hitLeft || hitRight) {
        this.x = hitLeft ? 0 : VIEW.w - CHICKEN.w;
        this.vx = -this.vx;
        this.dir = -this.dir;
        this.bounces--;
      }
    }
    this.trackOnScreen(dt);

    const gone =
      (this.vx > 0 && this.x > VIEW.w + MARGIN) ||
      (this.vx < 0 && this.x < -CHICKEN.w - MARGIN) ||
      this.y < -CHICKEN.h - MARGIN ||
      this.y > VIEW.h + MARGIN;
    if (gone) this.dead = true;
  }

  private trackOnScreen(dt: number): void {
    const inside = this.x >= 0 && this.x <= VIEW.w - CHICKEN.w && this.y >= HUD.playTop;
    if (inside) this.onScreenTime += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    let flap: number = CHICKEN.flapFrames;
    if (this.state === 'tumbling') flap = CHICKEN.tumbleFlapFrames;
    if (this.state === 'hovering') flap = DIVER.flapFrames; // frantic flapping is the warning
    const frame = Math.floor((this.age * 60) / flap) % 2;
    // A tumbling chicken faces the way it is thrown.
    const facingRight = this.state === 'tumbling' ? this.vx > 0 : this.dir > 0;
    // Hovering divers jitter a pixel side to side.
    const jitter = this.state === 'hovering' ? (Math.floor(this.age * 20) % 2) : 0;
    ctx.drawImage((facingRight ? RIGHT : LEFT)[frame], Math.round(this.x) + jitter, Math.round(this.y));
  }
}
