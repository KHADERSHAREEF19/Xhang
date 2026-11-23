export interface Clock {
  now(): number;
}
export type SessionState = "idle" | "running" | "submitted" | "failed";
export class Session {
  state: SessionState = "idle";
  constructor(
    readonly durationMs: number,
    readonly clock: Clock,
  ) {
    if (!Number.isFinite(durationMs) || durationMs <= 0)
      throw new Error("Invalid duration");
  }
  start(): void {
    if (this.state !== "idle") throw new Error("One attempt");
    this.state = "running";
  }
  tick(): void {
    if (this.state === "running" && this.clock.now() >= this.durationMs)
      this.state = "failed";
  }
  submit(): boolean {
    this.tick();
    if (this.state !== "running" || this.clock.now() < 0) return false;
    this.state = "submitted";
    return true;
  }
  fail(): void {
    if (this.state === "running") this.state = "failed";
  }
}
export class FakeClock implements Clock {
  value = 0;
  now(): number {
    return this.value;
  }
}
