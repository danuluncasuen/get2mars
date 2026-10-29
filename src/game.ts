import type { Sound } from './audio';
import {
  ASTEROID,
  AUDIO,
  CHICKEN,
  DEATH,
  EGGS,
  MUTE_BUTTON,
  NEAR_MISS,
  PALETTE,
  POWERUP,
  REVERSE,
  ROCKET,
  SCORE,
  SCREENS,
  VIEW,
  type PowerKind,
} from './config';
import { Asteroid } from './entities/asteroid';
import { Chicken } from './entities/chicken';
import { Pickup } from './entities/pickup';
import { Rocket } from './entities/rocket';
import { Starfield } from './entities/stars';
import { buzz } from './haptics';
import { renderHud } from './hud';
import type { Input } from './input';
import { renderGameOver, renderTitle } from './screens';
import { ROCKET_COLORS, ROCKET_MAP } from './sprites';
import { boxesOverlap, circleHitsBox } from './systems/collision';
import { sampleDifficulty } from './systems/difficulty';
import { FlockSpawner } from './systems/flocks';
import { Particles } from './systems/particles';
import { PickupSpawner } from './systems/pickups';
import { Popups } from './systems/popups';
import { Shake } from './systems/shake';
import { AsteroidSpawner } from './systems/spawner';
import { loadBest, saveBest } from './storage';

// doomed: third egg filled, eggs blink before the rocket explodes.
type State = 'title' | 'playing' | 'doomed' | 'dying' | 'over';
export type DeathCause = 'asteroid' | 'chicken';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class Game {
  private state: State = 'title';
  private screenTime = 0; // seconds on the title or game over screen
  private frame = 0;
  private time = 0; // seconds into the current run
  private score = 0;
  private stateTimer = 0; // counts down in doomed and dying
  deathCause: DeathCause = 'asteroid';
  private best = loadBest();
  private newBest = false;

  // Chicken trouble
  private eggs = 0;
  private sinceChickenHit = 0; // drives egg decay
  private immunity = 0;
  private reverseTimer = 0;
  private wobbleTimer = 0;

  // Power-ups
  private shieldTimer = 0;
  private slowTimer = 0;

  private readonly stars = new Starfield();
  private readonly rocket = new Rocket();
  private asteroids: Asteroid[] = [];
  private chickens: Chicken[] = [];
  private pickups: Pickup[] = [];
  private readonly asteroidSpawner = new AsteroidSpawner();
  private readonly flockSpawner = new FlockSpawner();
  private readonly pickupSpawner = new PickupSpawner();
  private readonly particles = new Particles();
  private readonly popups = new Popups();
  readonly shake = new Shake();

  constructor(
    private readonly input: Input,
    private readonly sound: Sound,
    private readonly debug = false,
  ) {}

  private startRun(): void {
    this.input.consumeTap(); // the tap that started the run shouldn't linger
    this.state = 'playing';
    this.time = 0;
    this.score = 0;
    this.eggs = 0;
    this.sinceChickenHit = 0;
    this.immunity = 0;
    this.reverseTimer = 0;
    this.wobbleTimer = 0;
    this.shieldTimer = 0;
    this.slowTimer = 0;
    this.rocket.reset();
    this.asteroids = [];
    this.chickens = [];
    this.pickups = [];
    this.asteroidSpawner.reset();
    this.flockSpawner.reset();
    this.pickupSpawner.reset();
    this.particles.clear();
    this.popups.clear();
    this.shake.clear();
    this.sound.play('start');
    this.sound.startMusic();
  }

  update(dt: number): void {
    this.frame++;
    if (this.input.consumeMuteKey()) this.sound.toggleMute();
    // Slow motion slows the world; the rocket, score and timers keep real time.
    const slowed = this.slowTimer > 0;
    const wdt = slowed ? dt * POWERUP.slowFactor : dt;
    this.stars.update(wdt, this.state === 'title' ? 0.25 : 1);
    this.shake.update(dt);
    this.particles.update(dt);
    this.popups.update(dt);
    this.wobbleTimer = Math.max(0, this.wobbleTimer - dt);

    if (this.state === 'title' || this.state === 'over') {
      this.screenTime += dt;
      const tap = this.input.consumeTap();
      const ready = this.state === 'title' || this.screenTime >= SCREENS.retryLockout;
      if (tap && tap.x >= MUTE_BUTTON.hitX && tap.y >= 0 && tap.y < MUTE_BUTTON.hitY) this.sound.toggleMute();
      else if (tap && ready) this.startRun();
    }

    if (this.state === 'playing') {
      this.time += dt;
      this.score += SCORE.perSecond * dt;
      this.updateChickenEffects(dt);
      this.updatePowerups(dt);
      this.rocket.update(dt, this.input);
      const d = sampleDifficulty(this.time);
      const rocks = this.asteroidSpawner.update(wdt, d, this.asteroids);
      if (rocks.length) this.sound.play('warning');
      this.asteroids.push(...rocks);
      this.chickens.push(...this.flockSpawner.update(wdt, d, this.rocket.x));
      const pickup = this.pickupSpawner.update(wdt, this.eggs, this.asteroids);
      if (pickup) this.pickups.push(pickup);
    }

    for (const a of this.asteroids) a.update(wdt);
    for (const c of this.chickens) c.update(wdt);
    for (const p of this.pickups) p.update(wdt);
    if (this.state === 'playing') {
      this.checkAsteroids();
      if (this.state === 'playing') this.checkChickens();
      if (this.state === 'playing') this.checkPickups();
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead);
    this.chickens = this.chickens.filter((c) => !c.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);

    if (this.state === 'doomed' || this.state === 'dying') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === 'doomed') this.die('chicken');
        else this.showGameOver();
      }
    }

    // Music speeds up as the run gets harder and drops to half speed in slow motion.
    const rise = 1 + AUDIO.tempoRise * Math.min(1, this.time / 120);
    this.sound.update(rise * (this.slowTimer > 0 ? POWERUP.slowFactor : 1));
  }

  private updatePowerups(dt: number): void {
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.sound.play('slowOff');
    }
  }

  private updateChickenEffects(dt: number): void {
    this.immunity = Math.max(0, this.immunity - dt);
    if (this.reverseTimer > 0) {
      this.reverseTimer = Math.max(0, this.reverseTimer - dt);
      this.rocket.reversed = this.reverseTimer > 0;
    }
    if (this.eggs > 0) {
      this.sinceChickenHit += dt;
      if (this.sinceChickenHit >= EGGS.decay) {
        this.eggs--;
        this.sinceChickenHit = 0;
      }
    }
  }

  private checkAsteroids(): void {
    const box = this.rocket.hitbox;
    const rocketMidY = this.rocket.y + ROCKET.h / 2;
    for (const a of this.asteroids) {
      if (a.phase !== 'falling') continue;
      const cy = a.centerY;
      if (Math.abs(cy - rocketMidY) < ASTEROID.shakeRange) this.shake.add(1, 0.05);

      if (circleHitsBox(a.cx, cy, ASTEROID.hitRadius, box)) {
        if (this.shieldTimer > 0) {
          this.popShield(a);
          continue;
        }
        this.die('asteroid');
        return;
      }
      if (circleHitsBox(a.cx, cy, ASTEROID.hitRadius + NEAR_MISS.margin, box)) a.grazed = true;
      // Pay out only once the rock is fully past, so a graze that turns into a hit never scores.
      const passed = cy - ASTEROID.hitRadius >= box.y + box.h;
      if (a.grazed && passed && !a.nearMissed) {
        a.nearMissed = true;
        this.nearMiss(a.cx < this.rocket.x + ROCKET.w / 2 ? -1 : 1);
      }
    }
  }

  private checkChickens(): void {
    const box = this.rocket.hitbox;
    for (const c of this.chickens) {
      if (c.state !== 'flying' || !boxesOverlap(c.hitbox, box)) continue;
      // Chickens bounce off the shield without laying an egg.
      if (this.shieldTimer > 0) {
        this.bounceChicken(c);
        continue;
      }
      if (this.immunity > 0) return;
      this.hitChicken(c);
      return;
    }
  }

  private checkPickups(): void {
    const box = this.rocket.hitbox;
    for (const p of this.pickups) {
      if (p.dead || !boxesOverlap(p.hitbox, box)) continue;
      p.dead = true;
      this.collect(p.kind);
    }
  }

  private collect(kind: PowerKind): void {
    this.sound.play('pickup');
    const label = { shield: 'SHIELD', slow: 'SLOW', eggs: 'CLEAR' }[kind];
    this.popups.add(label, this.rocket.x + ROCKET.w / 2 - label.length * 4, this.rocket.y - 4);
    if (kind === 'shield') this.shieldTimer = POWERUP.shieldTime;
    if (kind === 'slow') {
      if (this.slowTimer === 0) this.sound.play('slowOn');
      this.slowTimer = POWERUP.slowTime;
    }
    if (kind === 'eggs') {
      this.eggs = 0;
      this.sinceChickenHit = 0;
      this.reverseTimer = 0;
      this.rocket.reversed = false;
    }
  }

  // An asteroid hit while shielded: the rock shatters and the shield is used up.
  private popShield(a: Asteroid): void {
    a.dead = true;
    this.shieldTimer = 0;
    const cy = a.centerY;
    for (let i = 0; i < POWERUP.popSparks; i++) {
      const angle = (i / POWERUP.popSparks) * Math.PI * 2;
      const speed = rand(40, 100);
      const color = i % 3 ? PALETTE.detail : PALETTE.rocket;
      this.particles.add(a.cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed - 30, rand(0.5, 1), color);
    }
    this.shake.add(DEATH.shake, DEATH.shakeTime);
    this.sound.play('shieldPop');
    buzz('shieldPop');
  }

  private bounceChicken(c: Chicken): void {
    const rocketMid = this.rocket.x + ROCKET.w / 2;
    c.tumble(c.x + CHICKEN.w / 2 < rocketMid ? -1 : 1);
    for (let i = 0; i < POWERUP.bounceFeathers; i++) {
      this.particles.add(c.x + CHICKEN.w / 2, c.y + CHICKEN.h / 2, rand(-50, 50), -rand(0, 80), rand(0.5, 0.9), PALETTE.rocket);
    }
    this.sound.play('bounce');
  }

  private hitChicken(c: Chicken): void {
    const rocketMid = this.rocket.x + ROCKET.w / 2;
    const chickenMid = c.x + CHICKEN.w / 2;
    c.tumble(chickenMid < rocketMid ? -1 : 1);

    const fx = (rocketMid + chickenMid) / 2;
    const fy = this.rocket.y + 2;
    for (let i = 0; i < CHICKEN.feathers; i++) {
      const color = i % 3 === 2 ? PALETTE.detail : PALETTE.rocket;
      this.particles.add(fx, fy, rand(-60, 60), -rand(0, 96), rand(0.6, 1), color);
    }

    this.eggs++;
    this.sinceChickenHit = 0;
    this.immunity = EGGS.immunity;
    this.reverseTimer = REVERSE.duration;
    this.rocket.reversed = true;
    this.wobbleTimer = REVERSE.shakeTime;

    this.sound.play('chicken');
    buzz('chicken');

    if (this.eggs >= EGGS.max) {
      this.sound.play('doom');
      this.sound.stopMusic();
      this.state = 'doomed';
      this.stateTimer = EGGS.doomTime;
      this.wobbleTimer = EGGS.doomTime;
    }
  }

  // side: -1 when the asteroid passed on the left, 1 on the right.
  private nearMiss(side: number): void {
    this.score += NEAR_MISS.points;
    this.sound.play('nearMiss');
    buzz('nearMiss');
    const sx = side < 0 ? this.rocket.x : this.rocket.x + ROCKET.w - 1;
    const sy = this.rocket.y + 6;
    for (let i = 0; i < NEAR_MISS.sparks; i++) {
      const color = i % 3 ? PALETTE.rocket : PALETTE.detail;
      this.particles.add(sx, sy, side * rand(30, 90), -rand(20, 90), rand(0.5, 0.8), color);
    }
    // Popup sits on the side away from the asteroid.
    const px = side < 0 ? this.rocket.x + ROCKET.w + 1 : this.rocket.x - 25;
    this.popups.add(`+${NEAR_MISS.points}`, px, this.rocket.y - 2);
  }

  private die(cause: DeathCause): void {
    this.state = 'dying';
    this.deathCause = cause;
    this.stateTimer = DEATH.duration;
    this.rocket.reversed = false;
    this.reverseTimer = 0;
    this.shieldTimer = 0;
    this.slowTimer = 0;
    this.shake.add(DEATH.shake, DEATH.shakeTime);
    this.sound.stopMusic();
    this.sound.play('crash');
    buzz('crash');
    // The rocket breaks into its own pixels.
    const x0 = Math.round(this.rocket.x);
    ROCKET_MAP.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        const color = ROCKET_COLORS[ch];
        if (!color) return;
        const vx = (i - 4) * 15 + rand(-30, 30);
        const vy = (j - 6) * 12 - rand(0, 72);
        this.particles.add(x0 + i, this.rocket.y + j, vx, vy, rand(DEATH.lifeMin, DEATH.lifeMax), color);
      });
    });
  }

  private showGameOver(): void {
    this.state = 'over';
    this.screenTime = 0;
    this.newBest = Math.floor(this.score) > this.best;
    if (this.newBest) {
      this.best = Math.floor(this.score);
      saveBest(this.best);
    }
    this.sound.play(this.newBest ? 'newBest' : 'gameOver');
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    this.stars.render(ctx, this.frame);
    if (this.state === 'title') {
      renderTitle(ctx, this.screenTime, this.best, this.sound.muted);
      return;
    }
    for (const a of this.asteroids) a.render(ctx);
    for (const p of this.pickups) p.render(ctx);
    for (const c of this.chickens) c.render(ctx);
    if (this.state === 'playing' || this.state === 'doomed') this.renderRocket(ctx);
    this.particles.render(ctx);
    this.popups.render(ctx);
    if (this.debug) this.renderDebug(ctx);
    if (this.state === 'over') {
      renderGameOver(ctx, {
        score: this.score,
        best: this.best,
        newBest: this.newBest,
        cause: this.deathCause,
        time: this.screenTime,
        muted: this.sound.muted,
      });
      return;
    }
    this.renderPowerTimers(ctx);
    renderHud(ctx, {
      score: this.score,
      eggs: this.eggs,
      reversed: this.rocket.reversed,
      eggsBlink: this.state === 'doomed',
      frame: this.frame,
    });
  }

  private renderRocket(ctx: CanvasRenderingContext2D): void {
    let wobble = 0;
    if (this.wobbleTimer > 0) {
      const fade = this.wobbleTimer / REVERSE.shakeTime;
      wobble = Math.round(Math.sin(this.frame * 0.9) * REVERSE.shake * Math.min(1, fade));
    }
    this.rocket.render(ctx, this.frame, wobble);

    // Shield: a ring of pixels circling the rocket, blinking as it runs out.
    const blinkOff = this.shieldTimer < POWERUP.expiryBlink && Math.floor(this.frame / 6) % 2;
    if (this.shieldTimer > 0 && !blinkOff) {
      const cx = this.rocket.x + wobble + ROCKET.w / 2 - 0.5;
      const cy = this.rocket.y + ROCKET.h / 2;
      for (let i = 0; i < POWERUP.shieldDots; i++) {
        const a = this.frame * 0.05 + (i * Math.PI * 2) / POWERUP.shieldDots;
        ctx.fillStyle = i % 2 ? PALETTE.detail : PALETTE.rocket;
        ctx.fillRect(Math.round(cx + Math.cos(a) * POWERUP.shieldRadius), Math.round(cy + Math.sin(a) * POWERUP.shieldRadius), 1, 1);
      }
    }

    // Dizzy pixels orbit above the rocket while controls are reversed.
    if (this.rocket.reversed) {
      ctx.fillStyle = PALETTE.detail;
      const cx = this.rocket.x + wobble + ROCKET.w / 2 - 0.5;
      const cy = this.rocket.y - 5;
      for (let i = 0; i < REVERSE.dizzyPixels; i++) {
        const a = this.frame * 0.2 + (i * Math.PI * 2) / REVERSE.dizzyPixels;
        ctx.fillRect(Math.round(cx + Math.cos(a) * 6), Math.round(cy + Math.sin(a) * 2), 1, 1);
      }
    }
  }

  // Thin countdown lines along the bottom edge: cream for the shield, orange for slow motion.
  private renderPowerTimers(ctx: CanvasRenderingContext2D): void {
    const line = (t: number, total: number, y: number, color: string) => {
      if (t <= 0 || (t < POWERUP.expiryBlink && Math.floor(this.frame / 6) % 2)) return;
      ctx.fillStyle = color;
      ctx.fillRect(0, y, Math.ceil((VIEW.w * t) / total), 1);
    };
    line(this.shieldTimer, POWERUP.shieldTime, VIEW.h - 1, PALETTE.rocket);
    line(this.slowTimer, POWERUP.slowTime, VIEW.h - 3, PALETTE.detail);
  }

  private renderDebug(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = PALETTE.rocket;
    ctx.lineWidth = 1;
    const outline = (b: { x: number; y: number; w: number; h: number }) =>
      ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, b.w - 1, b.h - 1);
    outline(this.rocket.hitbox);
    for (const c of this.chickens) if (c.state === 'flying') outline(c.hitbox);
    for (const p of this.pickups) outline(p.hitbox);
    for (const a of this.asteroids) {
      if (a.phase !== 'falling') continue;
      ctx.beginPath();
      ctx.arc(a.cx, a.centerY, ASTEROID.hitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
