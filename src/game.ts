import type { Sound } from './audio';
import {
  ASTEROID,
  AUDIO,
  CHICKEN,
  DAZE,
  HUD,
  DEATH,
  EGG_DROP,
  LIVES,
  MUTE_BUTTON,
  NEAR_MISS,
  PALETTE,
  PAUSE,
  POWERUP,
  REVERSE,
  ROCKET,
  SCORE,
  SCREENS,
  STAR_TRAIL,
  TESTING,
  UNLOCK,
  UNLOCK_NAMES,
  VIEW,
  type PowerKind,
} from './config';
import { Asteroid } from './entities/asteroid';
import { Chicken } from './entities/chicken';
import { Egg, randomEggKind } from './entities/egg';
import { Mars } from './entities/mars';
import { Pickup } from './entities/pickup';
import { Rocket } from './entities/rocket';
import { Starfield } from './entities/stars';
import { buzz } from './haptics';
import { renderHud } from './hud';
import type { Input } from './input';
import { renderGameOver, renderPause, renderTitle } from './screens';
import { ROCKET_COLORS, ROCKET_MAP } from './sprites';
import { boxesOverlap, circleHitsBox } from './systems/collision';
import { sampleDifficulty } from './systems/difficulty';
import { DiverSpawner, FlockSpawner } from './systems/flocks';
import { Particles } from './systems/particles';
import { PickupSpawner } from './systems/pickups';
import { Popups } from './systems/popups';
import { Shake } from './systems/shake';
import { AsteroidSpawner } from './systems/spawner';
import { StarTrails } from './systems/startrails';
import { Yolk } from './systems/yolk';
import { loadBest, saveBest } from './storage';

// doomed: last heart lost, hearts blink before the rocket explodes.
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

  // Chicken trouble. `hits` are lost hearts; falling eggs are `droppedEggs`.
  private hits = 0;
  private sinceChickenHit = 0; // drives heart regen
  private immunity = 0;
  private dazeTimer = 0; // chicken hit: the rocket flies slow
  private reverseTimer = 0; // orange egg: left and right swap
  private wobbleTimer = 0;

  // Power-ups
  private shieldTimer = 0;
  private timeTimer = 0; // TIME: the world runs slow

  // Pause sits on top of a run: 'countdown' counts 3, 2, 1 back into play.
  private pause: 'off' | 'paused' | 'countdown' = 'off';
  private pauseTime = 0; // s in the current pause phase

  private readonly announced = new Set<keyof typeof UNLOCK>();

  private readonly stars = new Starfield();
  private readonly mars = new Mars();
  private readonly rocket = new Rocket();
  private asteroids: Asteroid[] = [];
  private chickens: Chicken[] = [];
  private pickups: Pickup[] = [];
  private droppedEggs: Egg[] = [];
  private readonly asteroidSpawner = new AsteroidSpawner();
  private readonly flockSpawner = new FlockSpawner();
  private readonly diverSpawner = new DiverSpawner();
  private readonly pickupSpawner = new PickupSpawner();
  private readonly starTrails = new StarTrails();
  private readonly yolk = new Yolk();
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
    this.hits = 0;
    this.sinceChickenHit = 0;
    this.immunity = 0;
    this.dazeTimer = 0;
    this.reverseTimer = 0;
    this.wobbleTimer = 0;
    this.shieldTimer = 0;
    this.timeTimer = 0;
    this.announced.clear();
    this.rocket.reset();
    this.asteroids = [];
    this.chickens = [];
    this.pickups = [];
    this.droppedEggs = [];
    this.asteroidSpawner.reset();
    this.flockSpawner.reset();
    this.diverSpawner.reset();
    this.pickupSpawner.reset();
    this.starTrails.reset();
    this.yolk.clear();
    this.particles.clear();
    this.popups.clear();
    this.shake.clear();
    this.sound.play('start');
    this.sound.startMusic();
  }

  private unlocked(feature: keyof typeof UNLOCK): boolean {
    return this.time >= UNLOCK[feature] * TESTING.unlockScale;
  }

  update(dt: number): void {
    if (this.input.consumeMuteKey()) this.sound.toggleMute();
    const pauseKey = this.input.consumePauseKey();
    if (this.pause !== 'off') {
      this.updatePause(dt, pauseKey);
      return;
    }
    this.frame++;
    // TIME slows the world; the rocket, score and timers keep real time.
    const wdt = this.timeTimer > 0 ? dt * POWERUP.timeFactor : dt;
    const playing = this.state === 'playing';
    this.stars.update(wdt, this.state === 'title' ? 0.25 : 1);
    this.shake.update(dt);
    this.particles.update(dt);
    this.popups.update(dt);
    this.yolk.update(dt);
    this.wobbleTimer = Math.max(0, this.wobbleTimer - dt);

    if (this.state === 'title' || this.state === 'over') {
      this.screenTime += dt;
      const tap = this.input.consumeTap();
      const ready = this.state === 'title' || this.screenTime >= SCREENS.retryLockout;
      if (tap && tap.x >= MUTE_BUTTON.hitX && tap.y >= 0 && tap.y < MUTE_BUTTON.hitY) this.sound.toggleMute();
      else if (tap && ready) this.startRun();
    }

    if (playing) {
      const tap = this.input.consumeTap();
      // Keyboard taps have no position (y -1), so only real taps on the bar pause.
      if (pauseKey || (tap && tap.y >= 0 && tap.y < HUD.playTop)) {
        this.pauseGame();
        return;
      }
      this.time += dt;
      this.score += SCORE.perSecond * dt;
      this.announceUnlocks();
      this.updateEffects(dt);
      this.updatePowerups(dt);
      this.rocket.update(dt, this.input);
      const d = sampleDifficulty(this.time);
      const rocks = this.asteroidSpawner.update(wdt, d, this.asteroids);
      if (rocks.length) this.sound.play('warning');
      this.asteroids.push(...rocks);
      const eggLayers = this.unlocked('eggLayers');
      this.chickens.push(
        ...this.flockSpawner.update(wdt, d, this.rocket.x, this.rocket.y, this.unlocked('bouncers'), eggLayers),
      );
      if (this.unlocked('divers')) {
        const diver = this.diverSpawner.update(wdt, eggLayers);
        if (diver) this.chickens.push(diver);
      }
      const pickup = this.pickupSpawner.update(wdt, this.needsClear, this.asteroids);
      if (pickup) this.pickups.push(pickup);
    }

    for (const a of this.asteroids) a.update(wdt);
    for (const c of this.chickens) {
      c.update(wdt);
      if (c.state === 'hovering' && c.hoverLeft <= 0) {
        c.dive(this.rocket.x + ROCKET.w / 2, this.rocket.y + ROCKET.h / 2);
        if (playing) this.sound.play('dive');
      }
      if (c.dropEgg()) {
        const x = c.x + CHICKEN.w / 2 - EGG_DROP.w / 2;
        this.droppedEggs.push(new Egg(Math.round(x), Math.round(c.y + CHICKEN.h - 2), randomEggKind()));
      }
    }
    for (const p of this.pickups) p.update(wdt);
    for (const e of this.droppedEggs) e.update(wdt);
    this.starTrails.update(wdt, playing && this.unlocked('stars'));
    if (playing) {
      this.checkAsteroids();
      if (this.state === 'playing') this.checkChickens();
      if (this.state === 'playing') this.checkPickups();
      if (this.state === 'playing') this.checkStars();
      if (this.state === 'playing') this.checkEggs();
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead);
    this.chickens = this.chickens.filter((c) => !c.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    this.droppedEggs = this.droppedEggs.filter((e) => !e.dead);

    if (this.state === 'doomed' || this.state === 'dying') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        if (this.state === 'doomed') this.die('chicken');
        else this.showGameOver();
      }
    }

    this.sound.update(this.musicTempo);
  }

  // Music speeds up as the run gets harder and drops to half speed during TIME.
  private get musicTempo(): number {
    const rise = 1 + AUDIO.tempoRise * Math.min(1, this.time / 120);
    return rise * (this.timeTimer > 0 ? POWERUP.timeFactor : 1);
  }

  // Freezes a run, e.g. when the app goes to the background. Does nothing outside a run.
  pauseGame(): void {
    if (this.state !== 'playing' || this.pause === 'paused') return;
    this.pause = 'paused';
    this.pauseTime = 0;
    this.sound.pause();
  }

  private updatePause(dt: number, pauseKey: boolean): void {
    const before = this.countdownLeft;
    this.pauseTime += dt;
    const tap = this.input.consumeTap();
    if (this.pause === 'paused') {
      const m = PAUSE.mute;
      const onMute = tap && tap.x >= m.hitX && tap.x < m.hitX + m.hitW && tap.y >= m.hitY && tap.y < m.hitY + m.hitH;
      if (onMute) this.sound.toggleMute();
      else if (tap || pauseKey) {
        this.pause = 'countdown';
        this.pauseTime = 0;
        this.sound.resume();
        this.sound.play('blip');
      }
      return;
    }
    // The music plays on through the countdown, a cue that the run is about to resume.
    this.sound.update(this.musicTempo);
    const left = this.countdownLeft;
    if (left === 0) this.pause = 'off';
    else if (left !== before) this.sound.play('blip');
  }

  // The number shown during the countdown; 0 once it is over.
  private get countdownLeft(): number {
    if (this.pause !== 'countdown') return 0;
    return Math.max(0, PAUSE.countdown - Math.floor(this.pauseTime / PAUSE.countdownStep));
  }

  // Names each new kind of thing the moment it starts showing up.
  private announceUnlocks(): void {
    for (const key of Object.keys(UNLOCK) as (keyof typeof UNLOCK)[]) {
      if (this.announced.has(key) || !this.unlocked(key)) continue;
      this.announced.add(key);
      const name = UNLOCK_NAMES[key];
      this.popups.add(name, VIEW.w / 2 - name.length * 4, 64);
      this.sound.play('announce');
    }
  }

  // A CLEAR power-up would help: lost hearts, or an effect on the rocket.
  private get needsClear(): boolean {
    return this.hits > 0 || this.dazeTimer > 0 || this.reverseTimer > 0 || this.yolk.active;
  }

  private updatePowerups(dt: number): void {
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.timeTimer > 0) {
      this.timeTimer = Math.max(0, this.timeTimer - dt);
      if (this.timeTimer === 0) this.sound.play('slowOff');
    }
  }

  private updateEffects(dt: number): void {
    this.immunity = Math.max(0, this.immunity - dt);
    if (this.dazeTimer > 0) {
      this.dazeTimer = Math.max(0, this.dazeTimer - dt);
      this.rocket.speedScale = this.dazeTimer > 0 ? DAZE.speed : 1;
    }
    if (this.reverseTimer > 0) {
      this.reverseTimer = Math.max(0, this.reverseTimer - dt);
      this.rocket.reversed = this.reverseTimer > 0;
    }
    if (this.hits > 0) {
      this.sinceChickenHit += dt;
      if (this.sinceChickenHit >= LIVES.regen) {
        this.hits--;
        this.sinceChickenHit = 0;
      }
    }
  }

  private clearEffects(): void {
    this.dazeTimer = 0;
    this.reverseTimer = 0;
    this.rocket.speedScale = 1;
    this.rocket.reversed = false;
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
    const label = { shield: 'SHIELD', time: 'TIME', eggs: 'CLEAR' }[kind];
    this.popups.add(label, this.rocket.x + ROCKET.w / 2 - label.length * 4, this.rocket.y - 4);
    if (kind === 'shield') this.shieldTimer = POWERUP.shieldTime;
    if (kind === 'time') {
      if (this.timeTimer === 0) this.sound.play('slowOn');
      this.timeTimer = POWERUP.timeTime;
    }
    if (kind === 'eggs') {
      this.hits = 0;
      this.sinceChickenHit = 0;
      this.clearEffects();
      this.yolk.clear();
    }
  }

  private checkStars(): void {
    for (const hit of this.starTrails.collect(this.rocket.hitbox)) {
      this.score += STAR_TRAIL.points;
      this.sound.play('star', hit.index);
      buzz('star');
      for (let i = 0; i < 4; i++) {
        this.particles.add(hit.x, hit.y, rand(-40, 40), -rand(10, 60), rand(0.2, 0.4), PALETTE.rocket);
      }
      if (hit.perfect) {
        this.score += STAR_TRAIL.perfectBonus;
        this.popups.add(`+${STAR_TRAIL.perfectBonus}`, this.rocket.x + ROCKET.w / 2 - 12, this.rocket.y - 4);
        this.sound.play('trail');
      }
    }
  }

  private checkEggs(): void {
    const box = this.rocket.hitbox;
    for (const e of this.droppedEggs) {
      if (e.dead || !boxesOverlap(e.hitbox, box)) continue;
      e.dead = true;
      if (e.kind === 'golden') {
        this.collectGolden();
        continue;
      }
      this.breakEgg(e);
      // The shield takes bad eggs harmlessly.
      if (this.shieldTimer > 0) {
        this.sound.play('bounce');
        continue;
      }
      buzz('egg');
      if (e.kind === 'splat') {
        this.yolk.add();
        this.sound.play('splat');
      } else {
        this.reverseTimer = REVERSE.duration;
        this.rocket.reversed = true;
        this.sound.play('reverse');
      }
    }
  }

  private breakEgg(e: Egg): void {
    const color = e.kind === 'reverse' ? PALETTE.detail : PALETTE.rocket;
    for (let i = 0; i < EGG_DROP.breakBits; i++) {
      this.particles.add(e.x + 2, e.y + 2, rand(-50, 50), -rand(20, 80), rand(0.4, 0.7), color);
    }
  }

  // Golden egg: a big bonus, or a free power-up.
  private collectGolden(): void {
    this.sound.play('golden');
    buzz('egg');
    for (let i = 0; i < 12; i++) {
      const color = i % 2 ? PALETTE.detail : PALETTE.rocket;
      this.particles.add(this.rocket.x + ROCKET.w / 2, this.rocket.y, rand(-70, 70), -rand(30, 100), rand(0.5, 0.9), color);
    }
    if (Math.random() < EGG_DROP.goldenPowerChance) {
      this.collect(Math.random() < 0.5 ? 'shield' : 'time');
      return;
    }
    this.score += EGG_DROP.goldenPoints;
    this.popups.add(`+${EGG_DROP.goldenPoints}`, this.rocket.x + ROCKET.w / 2 - 16, this.rocket.y - 4);
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

    this.hits++;
    this.sinceChickenHit = 0;
    this.immunity = LIVES.immunity;
    this.dazeTimer = DAZE.duration;
    this.rocket.speedScale = DAZE.speed;
    this.wobbleTimer = DAZE.shakeTime;

    this.sound.play('chicken');
    buzz('chicken');

    if (this.hits >= LIVES.max) {
      this.sound.play('doom');
      this.sound.stopMusic();
      this.state = 'doomed';
      this.stateTimer = LIVES.doomTime;
      this.wobbleTimer = LIVES.doomTime;
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
    this.clearEffects();
    this.shieldTimer = 0;
    this.timeTimer = 0;
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
        this.particles.add(x0 + i, Math.round(this.rocket.y) + j, vx, vy, rand(DEATH.lifeMin, DEATH.lifeMax), color);
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
    this.mars.render(ctx, this.time);
    for (const a of this.asteroids) a.render(ctx);
    for (const p of this.pickups) p.render(ctx);
    this.starTrails.render(ctx, this.frame);
    for (const e of this.droppedEggs) e.render(ctx);
    for (const c of this.chickens) c.render(ctx);
    if (this.state === 'playing' || this.state === 'doomed') this.renderRocket(ctx);
    this.particles.render(ctx);
    this.yolk.render(ctx);
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
      hits: this.hits,
      reversed: this.rocket.reversed,
      dazed: this.dazeTimer > 0,
      heartsBlink: this.state === 'doomed',
      frame: this.frame,
    });
    if (this.pause !== 'off') renderPause(ctx, this.pauseTime, this.countdownLeft, this.sound.muted);
  }

  private renderRocket(ctx: CanvasRenderingContext2D): void {
    let wobble = 0;
    if (this.wobbleTimer > 0) {
      const fade = this.wobbleTimer / DAZE.shakeTime;
      wobble = Math.round(Math.sin(this.frame * 0.9) * DAZE.shake * Math.min(1, fade));
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

    // Dazed: a feather stuck to the rocket's side, swaying.
    if (this.dazeTimer > 0) {
      const fx = Math.round(this.rocket.x + wobble) + ROCKET.w;
      const fy = Math.round(this.rocket.y) + 4;
      const sway = Math.round(Math.sin(this.frame * 0.15));
      ctx.fillStyle = PALETTE.rocket;
      ctx.fillRect(fx, fy + 2, 1, 1);
      ctx.fillRect(fx + 1 + sway, fy + 1, 1, 1);
      ctx.fillRect(fx + 1 + sway, fy, 2, 1);
      ctx.fillStyle = PALETTE.detail;
      ctx.fillRect(fx + 3 + sway, fy - 1, 1, 1);
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

  // Thin countdown lines along the bottom edge: cream for the shield, orange for TIME.
  private renderPowerTimers(ctx: CanvasRenderingContext2D): void {
    const line = (t: number, total: number, y: number, color: string) => {
      if (t <= 0 || (t < POWERUP.expiryBlink && Math.floor(this.frame / 6) % 2)) return;
      ctx.fillStyle = color;
      ctx.fillRect(0, y, Math.ceil((VIEW.w * t) / total), 1);
    };
    line(this.shieldTimer, POWERUP.shieldTime, VIEW.h - 1, PALETTE.rocket);
    line(this.timeTimer, POWERUP.timeTime, VIEW.h - 3, PALETTE.detail);
  }

  private renderDebug(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = PALETTE.rocket;
    ctx.lineWidth = 1;
    const outline = (b: { x: number; y: number; w: number; h: number }) =>
      ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, b.w - 1, b.h - 1);
    outline(this.rocket.hitbox);
    for (const c of this.chickens) if (c.state === 'flying') outline(c.hitbox);
    for (const p of this.pickups) outline(p.hitbox);
    for (const e of this.droppedEggs) outline(e.hitbox);
    for (const b of this.starTrails.boxes) outline(b);
    for (const a of this.asteroids) {
      if (a.phase !== 'falling') continue;
      ctx.beginPath();
      ctx.arc(a.cx, a.centerY, ASTEROID.hitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
