import { it, expect } from "vitest";
import { snap } from "../src/audio/analysis";
it("snaps within 150ms, inclusively, only when enabled", () => {
  expect(snap(3150, [3000, 5000], true)).toBe(3000);
  expect(snap(3151, [3000, 5000], true)).toBe(3151);
  expect(snap(3100, [3000], false)).toBe(3100);
  expect(snap(3100, [], true)).toBe(3100);
});
