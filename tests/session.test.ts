import { describe, it, expect } from "vitest";
import { Session, FakeClock } from "../src/core/session";
const setup = () => {
  const clock = new FakeClock();
  const session = new Session(25000, clock);
  session.start();
  return { clock, session };
};
describe("one explicit submission during playback", () => {
  it.each([0, 1, 1000, 13333, 24999.99])(
    "accepts submission at %s ms without waiting for song end",
    (ms) => {
      const { clock, session } = setup();
      clock.value = ms;
      expect(session.submit()).toBe(true);
      expect(session.state).toBe("submitted");
      expect(session.submit()).toBe(false);
    },
  );
  it("ignores early submit without consuming the attempt", () => {
    const { clock, session } = setup();
    clock.value = -1;
    expect(session.submit()).toBe(false);
    expect(session.state).toBe("running");
    clock.value = 0;
    expect(session.submit()).toBe(true);
  });
  it.each([25000, 25001])(
    "fails unsubmitted at or after song end: %s",
    (ms) => {
      const { clock, session } = setup();
      clock.value = ms;
      expect(session.submit()).toBe(false);
      expect(session.state).toBe("failed");
    },
  );
  it("does not retain credentials, length, per-letter state or correctness", () => {
    const { session } = setup();
    expect("captured" in session).toBe(false);
    expect("cues" in session).toBe(false);
    expect("expectedLength" in session).toBe(false);
  });
  it("cannot retry after blur/failure or restart a session", () => {
    const { session } = setup();
    session.fail();
    expect(session.submit()).toBe(false);
    expect(() => session.start()).toThrow("One attempt");
  });
  it("cannot turn a committed submission into another attempt", () => {
    const { clock, session } = setup();
    session.submit();
    clock.value = 99999;
    session.tick();
    session.fail();
    expect(session.state).toBe("submitted");
  });
  it("rejects invalid durations", () => {
    expect(() => new Session(0, new FakeClock())).toThrow();
    expect(() => new Session(NaN, new FakeClock())).toThrow();
  });
});
