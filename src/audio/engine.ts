import { CODES, type Letter } from "../core/keys";
export type Instrument = "piano" | "electric" | "organ" | "marimba" | "pad";
export class AudioEngine {
  context!: AudioContext;
  analyser!: AnalyserNode;
  master!: GainNode;
  source?: AudioBufferSourceNode;
  songGain?: GainNode;
  startAt = 0;
  instrument: Instrument = "piano";
  muted = false;
  async ready(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.65;
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.master.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
    if (this.context.state === "closed") {
      throw new Error("AudioContextClosed");
    }
    if (this.context.state !== "running") await this.context.resume();
    if (this.context.state !== "running") {
      throw new Error("AudioContextNotRunning");
    }
  }
  note(key: Letter): void {
    if (!this.context || this.context.state !== "running" || this.muted) return;
    const t = this.context.currentTime;
    const index = CODES.indexOf(key.code);
    if (index < 0) return;
    const hz = 130.81278265 * 2 ** ((index + (key.shift ? 12 : 0)) / 12);
    const gain = this.context.createGain();
    const duration =
      this.instrument === "pad"
        ? 1.8
        : this.instrument === "organ"
          ? 0.65
          : 1.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(
      0.13,
      t + (this.instrument === "pad" ? 0.15 : 0.008),
    );
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    gain.connect(this.master);
    for (let harmonic = 1; harmonic <= 3; harmonic++) {
      const osc = this.context.createOscillator();
      const partial = this.context.createGain();
      osc.type = this.instrument === "electric" ? "triangle" : "sine";
      osc.frequency.value =
        hz * (this.instrument === "marimba" && harmonic === 3 ? 6 : harmonic);
      partial.gain.value =
        1 / harmonic ** (this.instrument === "organ" ? 1 : 2.5);
      osc.connect(partial);
      partial.connect(gain);
      osc.start(t);
      osc.stop(t + duration + 0.03);
      osc.onended = () => {
        osc.disconnect();
        partial.disconnect();
      };
    }
    setTimeout(() => gain.disconnect(), (duration + 0.1) * 1000);
  }
  play(buffer: AudioBuffer, delay = 0): number {
    this.stop();
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.songGain = this.context.createGain();
    this.songGain.connect(this.master);
    this.source.connect(this.songGain);
    this.startAt = this.context.currentTime + delay;
    this.source.start(this.startAt);
    return this.startAt;
  }
  time(): number {
    return this.context
      ? Math.max(0, this.context.currentTime - this.startAt)
      : 0;
  }
  stop(fade = false): void {
    if (!this.source) return;
    const source = this.source;
    const gain = this.songGain;
    this.source = undefined;
    try {
      if (fade && gain) {
        gain.gain.setTargetAtTime(0, this.context.currentTime, 0.07);
        source.stop(this.context.currentTime + 0.35);
      } else source.stop();
    } catch {
      /* Already ended. */
    }
    source.onended = () => {
      source.disconnect();
      gain?.disconnect();
    };
  }
  latencyMs(): number {
    return (
      (this.context?.outputLatency || this.context?.baseLatency || 0) * 1000
    );
  }
}
export const audio = new AudioEngine();
