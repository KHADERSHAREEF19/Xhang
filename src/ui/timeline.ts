import { waveform } from "../audio/analysis";
import { timeLabel } from "./dom";
// Song-only display: no secret markers, onsets, letter counts, or timing targets.
export class Timeline {
  peaks: number[] = [];
  duration = 25;
  zoom = 1;
  time = 0;
  constructor(readonly canvas: HTMLCanvasElement) {}
  load(buffer: AudioBuffer): void {
    this.peaks = waveform(buffer);
    this.duration = buffer.duration;
    this.time = 0;
  }
  draw(): void {
    const c = this.canvas,
      dpr = Math.min(devicePixelRatio || 1, 2),
      w = c.clientWidth,
      h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const visible = this.duration / this.zoom;
    const offset = Math.max(
      0,
      Math.min(this.duration - visible, this.time - visible * 0.75),
    );
    for (let i = 0; i < w; i += 3) {
      const index = Math.floor(
        ((offset + (i / w) * visible) / this.duration) * this.peaks.length,
      );
      const p = this.peaks[index] || 0.025;
      ctx.fillStyle =
        offset + (i / w) * visible <= this.time ? "#af9af4" : "#45465f";
      ctx.fillRect(i, h / 2 - p * 22, 2, Math.max(2, p * 44));
    }
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    const tick = Math.max(1, Math.ceil(visible / 12));
    for (
      let sec = Math.ceil(offset / tick) * tick;
      sec <= offset + visible;
      sec += tick
    ) {
      const x = ((sec - offset) / visible) * w;
      ctx.fillStyle = "#9298b0";
      ctx.fillText(timeLabel(sec), x + 3, h - 3);
      ctx.fillStyle = "#ffffff10";
      ctx.fillRect(x, 0, 1, h - 14);
    }
    ctx.fillStyle = "#f2f1fb";
    ctx.fillRect(((this.time - offset) / visible) * w, 0, 1, h - 14);
  }
}
