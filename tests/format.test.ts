import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseFile,
  headerBytes,
  embed,
  MAGIC,
  ARGON2,
  type Header,
} from "../src/crypto/format";
import { decryptPackage } from "../src/crypto";
const fixture = () => new Uint8Array(readFileSync("public/demo.xhang.wav"));
const key = "xk3_AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";
it("decrypts the genuine v3 demo and leaves the original WAV unchanged", async () => {
  const p = parseFile(fixture());
  expect(Buffer.from(p.original).equals(readFileSync("public/demo.wav"))).toBe(
    true,
  );
  expect(new TextDecoder().decode(await decryptPackage(p, key))).toContain(
    "between friends",
  );
  expect(
    Buffer.from(embed(p.original, p.aad, p.ciphertext)).equals(
      Buffer.from(fixture()),
    ),
  ).toBe(true);
});
it("has eight magic bytes and an unsigned LE block size", () => {
  expect(new TextDecoder().decode(MAGIC)).toBe("XHANGv3\0");
  const f = fixture(),
    p = parseFile(f);
  expect(new DataView(f.buffer).getBigUint64(f.length - 16, true)).toBe(
    BigInt(4 + p.aad.length + p.ciphertext.length),
  );
});
it("stores no secret, sequence length or per-key verifier", () => {
  const p = parseFile(fixture());
  expect(Object.keys(p.header).sort()).toEqual(
    ["version", "salt", "iv", "mime", "carrierHash", "kdf"].sort(),
  );
  expect(new TextDecoder().decode(p.aad)).not.toMatch(
    /xk3_|"N"|cues|window|count|verifier/,
  );
});
it("rejects extra metadata, legacy formats, invalid framing and KDF denial-of-service settings", () => {
  const h = parseFile(fixture()).header;
  for (const changes of [
    { N: 10 },
    { version: 2 },
    { count: 4 },
    { cues: [] },
    { carrierHash: "bad" },
    { kdf: { ...ARGON2, memory: 2 ** 30 } },
    { kdf: { ...ARGON2, iterations: 1 } },
    { kdf: { name: "PBKDF2" } },
    { kdf: { name: "HKDF-SHA256", extra: 1 } },
  ])
    expect(() =>
      headerBytes({ ...h, ...changes } as unknown as Header),
    ).toThrow();
  const f = fixture();
  f[f.length - 2] = 50;
  expect(() => parseFile(f)).toThrow();
  const other = fixture();
  new DataView(other.buffer).setBigUint64(other.length - 16, 2n ** 63n, true);
  expect(() => parseFile(other)).toThrow();
});
it("authenticates valid header changes even if the caller rewrites the header", async () => {
  const p = parseFile(fixture());
  for (const header of [
    { ...p.header, mime: "audio/wav" },
    { ...p.header, salt: p.header.salt.map((v, i) => (i === 0 ? v ^ 1 : v)) },
    { ...p.header, iv: p.header.iv.map((v, i) => (i === 0 ? v ^ 1 : v)) },
  ])
    await expect(
      decryptPackage({ ...p, header, aad: headerBytes(header) }, key),
    ).rejects.toThrow();
});
