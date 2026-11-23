import { audio } from "../audio/engine";
import { Session, type Clock } from "./session";
export class Runner {
  session?: Session;
  started = 0;
  fakeMs: number | null = null;
  private notified = false;
  private finish?: (submitted: boolean) => void;
  readonly clock: Clock = {
    now: () => this.fakeMs ?? (audio.context.currentTime - this.started) * 1000,
  };
  get running(): boolean {
    return this.session?.state === "running";
  }
  async start(
    buffer: AudioBuffer,
    finish: (submitted: boolean) => void,
  ): Promise<void> {
    if (this.running) throw new Error("Session already active");
    await audio.ready();
    this.finish = finish;
    this.notified = false;
    this.started = audio.play(buffer, 3);
    this.fakeMs = this.fakeMs === null ? null : -3000;
    this.session = new Session(buffer.duration * 1000, this.clock);
    this.session.start();
  }
  submit(): boolean {
    const accepted = this.session?.submit() ?? false;
    this.tick();
    return accepted;
  }
  tick(): void {
    this.session?.tick();
    if (!this.session || this.notified || this.running) return;
    this.notified = true;
    audio.stop(true);
    this.finish?.(this.session.state === "submitted");
  }
  fail(): void {
    if (this.running) {
      this.session!.fail();
      this.tick();
    }
  }
}
export const runner = new Runner();
