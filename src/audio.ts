import { AUDIO } from './config';
import { loadMuted, saveMuted } from './storage';

export type Sfx =
  | 'start'
  | 'warning'
  | 'nearMiss'
  | 'chicken'
  | 'bounce'
  | 'doom'
  | 'crash'
  | 'gameOver'
  | 'newBest'
  | 'pickup'
  | 'shieldPop'
  | 'slowOn'
  | 'slowOff'
  | 'blip';

// Note number to Hz (69 = A4).
const hz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// Music: a 4-bar loop in A minor, one step per eighth note.
const BAR_ROOTS = [45, 41, 43, 40]; // A2 F2 G2 E2
const BASS_STEPS = [0, 0, 12, 0, 0, 12, 7, 12]; // semitones above the bar's root
const LEAD_CHORDS = [
  [69, 72, 76], // Am
  [65, 69, 72], // F
  [67, 71, 74], // G
  [64, 68, 71], // E
];
const LEAD_STEPS = [0, 1, 2, 1, 2, 1, 0, -1]; // chord tone index, -1 = rest

// Every sound is synthesized: square and triangle waves plus filtered noise. No audio files.
export class Sound {
  muted = loadMuted();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private playing = false;
  private nextStep = 0; // audio clock time of the next music step
  private step = 0;

  // Browsers (iOS especially) only start audio inside a user gesture, so call this from one.
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : AUDIO.volume;
      this.master.connect(ctx.destination);
      this.music = ctx.createGain();
      this.music.gain.value = AUDIO.musicVolume;
      this.music.connect(this.master);
      // One second of white noise, reused by every noisy effect.
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  toggleMute(): void {
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.muted ? 0 : AUDIO.volume, this.ctx.currentTime);
    if (!this.muted) this.play('blip');
  }

  play(name: Sfx): void {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'start':
        [72, 76, 79, 84].forEach((n, i) => this.tone('square', hz(n), hz(n), 0.07, 0.12, i * 0.06));
        break;
      case 'warning':
        this.tone('square', 880, 880, 0.06, 0.1);
        this.tone('square', 880, 880, 0.06, 0.1, 0.12);
        break;
      case 'nearMiss':
        this.tone('square', 660, 1320, 0.08, 0.1);
        this.tone('square', 1320, 1760, 0.08, 0.08, 0.06);
        break;
      case 'chicken':
        this.tone('square', 950, 500, 0.08, 0.12);
        this.tone('square', 1050, 420, 0.12, 0.12, 0.08);
        this.noise(0.06, 0.15, 3000, 3000);
        break;
      case 'bounce':
        this.tone('triangle', 300, 700, 0.1, 0.25);
        break;
      case 'doom':
        [0, 1, 2, 3].forEach((i) => this.tone('square', i % 2 ? 330 : 440, i % 2 ? 330 : 440, 0.1, 0.12, i * 0.12));
        break;
      case 'crash':
        this.noise(0.7, 0.5, 2500, 150);
        this.tone('square', 140, 35, 0.45, 0.2);
        break;
      case 'gameOver':
        [67, 64, 60, 55].forEach((n, i) => this.tone('square', hz(n), hz(n), 0.16, 0.1, i * 0.16));
        break;
      case 'newBest':
        [72, 76, 79, 84, 79, 84].forEach((n, i) => this.tone('square', hz(n), hz(n), 0.1, 0.1, i * 0.09));
        break;
      case 'pickup':
        [76, 81, 88].forEach((n, i) => this.tone('triangle', hz(n), hz(n), 0.08, 0.3, i * 0.05));
        break;
      case 'shieldPop':
        this.noise(0.3, 0.4, 5000, 400);
        this.tone('square', 900, 180, 0.25, 0.12);
        break;
      case 'slowOn':
        this.tone('square', 700, 140, 0.45, 0.1);
        break;
      case 'slowOff':
        this.tone('square', 140, 700, 0.25, 0.1);
        break;
      case 'blip':
        this.tone('square', 1200, 1200, 0.04, 0.08);
        break;
    }
  }

  startMusic(): void {
    if (!this.ctx) return;
    this.playing = true;
    this.step = 0;
    this.nextStep = this.ctx.currentTime + 0.1;
  }

  stopMusic(): void {
    this.playing = false;
  }

  // Call every frame; schedules music a little ahead. tempo: 1 = normal speed.
  update(tempo: number): void {
    if (!this.ctx || !this.playing) return;
    const now = this.ctx.currentTime;
    if (this.nextStep < now) this.nextStep = now + 0.02; // fell behind (tab was hidden)
    const stepTime = 30 / AUDIO.bpm / tempo; // eighth notes
    while (this.nextStep < now + 0.15) {
      this.scheduleStep(this.nextStep, stepTime);
      this.nextStep += stepTime;
      this.step++;
    }
  }

  private scheduleStep(at: number, len: number): void {
    const bar = Math.floor(this.step / 8) % BAR_ROOTS.length;
    const i = this.step % 8;
    const delay = at - this.ctx!.currentTime;
    this.tone('triangle', hz(BAR_ROOTS[bar] + BASS_STEPS[i]), 0, len * 0.9, 0.35, delay, this.music!);
    const lead = LEAD_STEPS[i];
    if (lead >= 0) this.tone('square', hz(LEAD_CHORDS[bar][lead]), 0, len * 0.5, 0.05, delay, this.music!);
  }

  // to: end frequency for a slide, or 0 to hold the pitch.
  private tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0, out?: AudioNode): void {
    const c = this.ctx!;
    const t = c.currentTime + Math.max(0, delay);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(out ?? this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Low-passed noise; the cutoff slides from `from` to `to` Hz.
  private noise(dur: number, vol: number, from: number, to: number): void {
    const c = this.ctx!;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
}
