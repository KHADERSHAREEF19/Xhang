import { audio } from "../audio/engine";
import type { VisualHit } from "../core/keys";
export class Spectrum {
  private flashAt = 0;
  private hit: VisualHit = { code: "", color: "#a499ff", intensity: 0 };
  private data = new Uint8Array(1024);
  constructor(private canvas: HTMLCanvasElement) {}
  burst(hit: VisualHit): void {
    this.hit = hit;
    this.flashAt = performance.now();
  }
  draw(now: number): { bass: number; level: number } {
    const canvas = this.canvas;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (audio.analyser) audio.analyser.getByteFrequencyData(this.data);
    let bass = 0,
      level = 0;
    for (let i = 0; i < this.data.length; i++) {
      level += this.data[i];
      if (i < 16) bass += this.data[i];
    }
    bass /= 16 * 255;
    level /= this.data.length * 255;
    const burst =
      Math.max(0, 1 - (now - this.flashAt) / 450) * this.hit.intensity;
    const bars = Math.max(30, Math.floor(w / 9));
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const value = this.data[Math.floor((i / bars) ** 2 * 650)] / 255;
      const bh =
        5 +
        value * (h - 40) +
        Math.sin(i * 0.7 + now / 1200) * 3 +
        burst * (30 + Math.sin(i) * 20);
      ctx.fillStyle =
        burst > 0.2
          ? this.hit.color
          : `hsl(${255 - (i / bars) * 80} 70% ${40 + value * 25}%)`;
      ctx.globalAlpha = 0.45 + value * 0.5 + burst * 0.2;
      ctx.beginPath();
      ctx.roundRect(i * barW, h - bh - 20, Math.max(2, barW - 4), bh, 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return { bass, level };
  }
}
