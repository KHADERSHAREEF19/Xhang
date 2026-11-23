import { it, expect } from "vitest";
import {
  generateKey,
  decodeKey,
  generatePassphrase,
  passphraseStrength,
  ownedBuffer,
} from "../src/core/credentials";
it("generates fresh canonical keys containing 256 random bits", () => {
  const a = generateKey(),
    b = generateKey();
  expect(a).not.toBe(b);
  expect(a).toMatch(/^xk3_[A-Za-z0-9_-]{43}$/);
  expect(decodeKey(a)).toHaveLength(32);
  expect(() => decodeKey("Justin")).toThrow();
});
it("rejects noncanonical base64 and allows surrounding copy whitespace", () => {
  const a = generateKey();
  expect(decodeKey(` \n${a} `)).toEqual(decodeKey(a));
  expect(() => decodeKey("xk3_" + "A".repeat(42) + "B")).toThrow();
});
it("guardrails are not entropy claims", () => {
  expect(passphraseStrength("Justin").ok).toBe(false);
  expect(passphraseStrength("a".repeat(40)).ok).toBe(false);
  expect(passphraseStrength(generatePassphrase()).ok).toBe(true);
  expect(
    passphraseStrength("velvet river copper lantern meadow orbit").text,
  ).toContain("not an entropy guarantee");
});
it("copies to ordinary owned ArrayBuffer for modern DOM binary typings", () => {
  const input = new Uint8Array([1, 2]);
  const buffer = ownedBuffer(input);
  input.fill(0);
  expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2]));
});
