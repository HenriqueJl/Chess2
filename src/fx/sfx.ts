/**
 * Efeitos sonoros sintetizados na hora com Web Audio: nenhum arquivo de áudio.
 * Cada efeito é uma pequena "receita" de osciladores e ruído.
 */
type Wave = OscillatorType;

class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;

  /** Navegadores só liberam áudio depois de um gesto do usuário. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private get ready(): boolean {
    return this.enabled && !!this.ctx && this.ctx.state === 'running';
  }

  /** Um tom com envelope e glissando opcional. */
  private tone(freq: number, dur: number, opts: { wave?: Wave; to?: number; vol?: number; delay?: number } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.wave ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const vol = opts.vol ?? 0.3;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, opts: { from?: number; to?: number; vol?: number; delay?: number; q?: number } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = opts.q ?? 1.5;
    filter.frequency.setValueAtTime(opts.from ?? 800, t);
    filter.frequency.exponentialRampToValueAtTime(opts.to ?? 3000, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.vol ?? 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  select() {
    this.tone(520, 0.08, { wave: 'triangle', to: 780, vol: 0.15 });
  }
  hop() {
    this.tone(300, 0.18, { wave: 'sine', to: 620, vol: 0.18 });
  }
  land() {
    this.tone(140, 0.12, { wave: 'triangle', to: 70, vol: 0.35 });
    this.noise(0.06, { from: 400, to: 200, vol: 0.15 });
  }
  /** Pancada + "boing" da vítima saindo voando. */
  capture() {
    this.noise(0.15, { from: 300, to: 120, vol: 0.5, q: 0.7 });
    this.tone(90, 0.2, { wave: 'square', to: 45, vol: 0.2 });
    this.tone(220, 0.5, { wave: 'sine', to: 880, vol: 0.2, delay: 0.05 });
    this.noise(0.6, { from: 600, to: 4000, vol: 0.12, delay: 0.08 });
  }
  check() {
    this.tone(880, 0.14, { wave: 'square', vol: 0.12 });
    this.tone(660, 0.14, { wave: 'square', vol: 0.12, delay: 0.16 });
    this.tone(880, 0.14, { wave: 'square', vol: 0.12, delay: 0.32 });
  }
  /** "Dun dun DUUUN" para tragédias (dama perdida). */
  dramatic() {
    this.tone(196, 0.25, { wave: 'sawtooth', vol: 0.18 });
    this.tone(185, 0.25, { wave: 'sawtooth', vol: 0.18, delay: 0.28 });
    this.tone(147, 1.1, { wave: 'sawtooth', vol: 0.22, delay: 0.56 });
  }
  /** Trombone triste: "uá uá uá uáááá". */
  sad() {
    const notes = [311, 294, 277];
    notes.forEach((f, i) => this.tone(f, 0.32, { wave: 'sawtooth', to: f * 0.97, vol: 0.15, delay: i * 0.35 }));
    this.tone(262, 1.0, { wave: 'sawtooth', to: 240, vol: 0.17, delay: 1.05 });
  }
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { wave: 'square', vol: 0.12, delay: i * 0.08 }));
  }
  fanfare() {
    const seq: Array<[number, number, number]> = [
      [523, 0, 0.15], [523, 0.15, 0.15], [523, 0.3, 0.15], [659, 0.45, 0.4], [784, 0.9, 0.2], [659, 1.1, 0.15], [784, 1.25, 0.8],
    ];
    seq.forEach(([f, d, dur]) => {
      this.tone(f, dur, { wave: 'square', vol: 0.12, delay: d });
      this.tone(f / 2, dur, { wave: 'triangle', vol: 0.12, delay: d });
    });
  }
  /** Risada de plateia sintetizada (bem tosca, de propósito). */
  laugh() {
    for (let i = 0; i < 6; i++) {
      const f = 380 + Math.random() * 120;
      this.tone(f, 0.11, { wave: 'triangle', to: f * 0.8, vol: 0.12, delay: i * 0.13 });
    }
  }
  pop() {
    this.tone(700, 0.06, { wave: 'sine', to: 1200, vol: 0.15 });
  }
}

export const sfx = new Sfx();
