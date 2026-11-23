export class Background {
  private particles = Array.from({ length: 42 }, (_, i) => ({
    x: (i * 0.618) % 1,
    y: (i * 0.379) % 1,
    r: 0.6 + (i % 4) * 0.35,
  }));
  private last = 0;
  private energy = 0;
  private bass = 0;
  private pulse = 0;
  readonly reduced = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(private canvas: HTMLCanvasElement) {}
  draw(now: number, bass: number, level: number): void {
    const c = this.canvas,
      ctx = c.getContext("2d")!;
    if (document.body.classList.contains("calm") || this.reduced.matches) {
      ctx.clearRect(0, 0, c.width, c.height);
      this.last = now;
      return;
    }
    const dt = this.last ? now - this.last : 16;
    this.last = now;
    if (dt > 20 && this.particles.length > 16) this.particles.pop();
    const dpr = Math.min(devicePixelRatio || 1, 2),
      w = innerWidth,
      h = innerHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.energy = this.energy * 0.94 + level * 0.06;
    const breath = Math.sin(now / 6000) * 0.025;
    const aurora = (
      x: number,
      y: number,
      r: number,
      color: string,
      opacity: number,
    ) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = opacity;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };
    aurora(
      w * (0.23 + Math.sin(now / 18000) * 0.1),
      h * 0.3,
      w * 0.65,
      "#6351c4",
      0.11 + breath + this.energy * 0.28,
    );
    aurora(
      w * (0.9 + Math.sin(now / 23000) * 0.1),
      h * 0.6,
      w * 0.6,
      "#188e94",
      0.055 + this.energy * 0.25,
    );
    ctx.globalAlpha = 0.07 + this.energy * 0.08;
    ctx.strokeStyle = "#7d90d1";
    ctx.lineWidth = 0.6;
    const horizon = h * 0.62;
    const drift = (now * (0.000015 + this.energy * 0.00006)) % 1;
    for (let i = 0; i < 16; i++) {
      const p = ((i + drift) / 16) ** 2;
      const y = horizon + p * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 18, horizon);
      ctx.lineTo(w / 2 + (i * w) / 7, h);
      ctx.stroke();
    }
    for (const p of this.particles) {
      const x = (p.x * w + Math.sin(now / 8000 + p.y * 10) * 15) % w;
      const y = (p.y * h - now * (0.001 + this.energy * 0.02)) % h;
      ctx.globalAlpha = 0.1 + this.energy * 0.25;
      ctx.fillStyle = p.x > 0.5 ? "#75e7dc" : "#baa4ff";
      ctx.beginPath();
      ctx.arc(x, y < 0 ? y + h : y, p.r * (1 + this.energy), 0, Math.PI * 2);
      ctx.fill();
    }
    if (bass - this.bass > 0.14 && bass > 0.55 && now - this.pulse > 400)
      this.pulse = now;
    this.bass = this.bass * 0.8 + bass * 0.2;
    const life = (now - this.pulse) / 1200;
    if (life < 1) {
      ctx.globalAlpha = (1 - life) * 0.1;
      ctx.strokeStyle = "#8bb4ed";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w * 0.7, h * 0.4, 40 + life * 260, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
