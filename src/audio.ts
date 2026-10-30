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
  | 'blip'
  | 'star'
  | 'trail'
  | 'dive'
  | 'splat'
  | 'reverse'
  | 'golden'
  | 'announce';

// Star chimes climb this scale (semitones above C6) as you take more of one trail.
const STAR_STEPS = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

// Note number to Hz (69 = A4).
const hz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

// Music: a slow, spacey 4-bar loop in A minor, one step per eighth note. A chord pad swells
// in each bar, a soft bass pulses on the half notes, and sparse high blips echo into the distance.
const BAR_ROOTS = [33, 29, 26, 28]; // A1 F1 D1 E1
const PADS = [
  [57, 60, 64, 71], // Am9: A C E B
  [53, 57, 60, 64], // Fmaj7: F A C E
  [50, 53, 57, 64], // Dm9: D F A E
  [52, 57, 59, 64], // Esus4: E A B E
];
// Pad tone index for the echoing blips, one octave above the pad, -1 = rest. Two patterns
// alternate every loop so the blips don't repeat too obviously.
const BLIPS = [
  [0, -1, -1, 2, -1, 3, -1, -1],
  [-1, 1, -1, -1, 3, -1, 2, -1],
];

// Every sound is synthesized: square and triangle waves plus filtered noise. No audio files.
export class Sound {
  muted = loadMuted();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private echo: GainNode | null = null; // send: whatever goes in here repeats and fades
  private noiseBuffer: AudioBuffer | null = null;
  private playing = false;
  private paused = false;
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
      // Echo: delay -> darker filter -> feedback back into the delay, all into the music bus.
      this.echo = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = AUDIO.echoTime;
      const dark = ctx.createBiquadFilter();
      dark.type = 'lowpass';
      dark.frequency.value = AUDIO.echoCutoff;
      const feedback = ctx.createGain();
      feedback.gain.value = AUDIO.echoFeedback;
      this.echo.connect(delay);
      delay.connect(dark);
      dark.connect(feedback);
      feedback.connect(delay);
      dark.connect(this.music);
      // One second of white noise, reused by every noisy effect.
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running' && !this.paused) this.ctx.resume().catch(() => {});
  }

  // Suspending freezes the audio clock, so the music picks up mid-bar on resume.
  pause(): void {
    this.paused = true;
    this.ctx?.suspend().catch(() => {});
  }

  resume(): void {
    this.paused = false;
    this.ctx?.resume().catch(() => {});
  }

  toggleMute(): void {
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.master && this.ctx) this.master.gain.setValueAtTime(this.muted ? 0 : AUDIO.volume, this.ctx.currentTime);
    if (!this.muted) this.play('blip');
  }

  // n: for 'star', how many stars of this trail were taken before it (raises the pitch).
  play(name: Sfx, n = 0): void {
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
      case 'star': {
        const note = hz(84 + STAR_STEPS[Math.min(n, STAR_STEPS.length - 1)]);
        this.tone('triangle', note, note, 0.07, 0.25);
        break;
      }
      case 'trail':
        [84, 88, 91, 96].forEach((note, i) => this.tone('triangle', hz(note), hz(note), 0.07, 0.3, i * 0.05));
        break;
      case 'dive':
        this.tone('square', 1400, 300, 0.35, 0.08);
        break;
      case 'splat':
        this.noise(0.25, 0.4, 900, 200);
        this.tone('triangle', 220, 90, 0.2, 0.3);
        break;
      case 'reverse':
        this.tone('square', 300, 900, 0.12, 0.1);
        this.tone('square', 900, 300, 0.12, 0.1, 0.12);
        break;
      case 'golden':
        [79, 84, 88, 91, 96].forEach((note, i) => this.tone('square', hz(note), hz(note), 0.08, 0.08, i * 0.06));
        break;
      case 'announce':
        this.tone('square', hz(76), hz(76), 0.08, 0.09);
        this.tone('square', hz(83), hz(83), 0.14, 0.09, 0.09);
        break;
    }
  }

  startMusic(): void {
    if (!this.ctx || !this.music) return;
    this.playing = true;
    this.step = 0;
    this.nextStep = this.ctx.currentTime + 0.1;
    const g = this.music.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(AUDIO.musicVolume, this.ctx.currentTime);
  }

  // Pads ring for a whole bar, so fade the music out instead of cutting it.
  stopMusic(): void {
    if (!this.ctx || !this.music || !this.playing) return;
    this.playing = false;
    const t = this.ctx.currentTime;
    const g = this.music.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + AUDIO.musicFade);
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
    const loop = Math.floor(this.step / (8 * BAR_ROOTS.length));
    const i = this.step % 8;
    const delay = at - this.ctx!.currentTime;
    const music = this.music!;
    // A new chord pad swells in at the top of each bar and fades by its end.
    if (i === 0) for (const note of PADS[bar]) this.pad(hz(note), at, len * 8);
    // Soft bass pulse on the half notes, two octaves under the pad.
    if (i % 4 === 0) this.tone('triangle', hz(BAR_ROOTS[bar] + 12), 0, len * 3.5, 0.3, delay, music);
    // Sparse high blips, sent into the echo so they trail off into space.
    const blip = BLIPS[loop % BLIPS.length][i];
    if (blip >= 0) {
      const f = hz(PADS[bar][blip] + 12);
      this.tone('square', f, 0, len * 0.6, 0.035, delay, music);
      this.tone('square', f, 0, len * 0.6, 0.05, delay, this.echo!);
    }
  }

  // A slow-swelling chord tone: two detuned triangles through a low-pass, so it shimmers.
  private pad(freq: number, at: number, dur: number): void {
    const c = this.ctx!;
    const t = Math.max(at, c.currentTime);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = AUDIO.padCutoff;
    const gain = c.createGain();
    const peak = 0.05;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + AUDIO.padAttack);
    gain.gain.setValueAtTime(peak, t + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(gain).connect(this.music!);
    for (const cents of [-AUDIO.padDetune / 2, AUDIO.padDetune / 2]) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
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
