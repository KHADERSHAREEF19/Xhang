import { describe, it, expect } from "vitest";
import { argon2id } from "@noble/hashes/argon2.js";
import { crypt, decryptPackage } from "../src/crypto";
import { generateKey } from "../src/core/credentials";
import {
  headerBytes,
  fileHash,
  ARGON2,
  type Header,
} from "../src/crypto/format";
const original = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]);
async function h(passphrase = false): Promise<Header> {
  return {
    version: 3,
    salt: Array.from(crypto.getRandomValues(new Uint8Array(16))),
    iv: Array.from(crypto.getRandomValues(new Uint8Array(12))),
    mime: "text/plain",
    carrierHash: await fileHash(original),
    kdf: passphrase ? { ...ARGON2 } : { name: "HKDF-SHA256" },
  };
}
describe("authenticated v3 credentials", () => {
  it("roundtrips a generated key and rejects wrong keys/modified AAD/ciphertext", async () => {
    const header = await h(),
      key = generateKey(),
      payload = new TextEncoder().encode("private words");
    const cipher = await crypt("encrypt", header, key, payload);
    expect(
      new TextDecoder().decode(await crypt("decrypt", header, key, cipher)),
    ).toBe("private words");
    await expect(
      crypt("decrypt", header, generateKey(), cipher),
    ).rejects.toThrow();
    await expect(
      crypt(
        "decrypt",
        header,
        key,
        cipher,
        new TextEncoder().encode(JSON.stringify(header, null, 2)),
      ),
    ).rejects.toThrow();
    cipher[0] ^= 1;
    await expect(crypt("decrypt", header, key, cipher)).rejects.toThrow();
  });
  it("Argon2id passphrases roundtrip, normalize NFC, report progress and reject a wrong passphrase", async () => {
    const header = await h(true),
      secret = "café river copper lantern meadow orbit";
    const progress: number[] = [];
    const cipher = await crypt(
      "encrypt",
      header,
      secret,
      new Uint8Array([3, 4, 5]),
      headerBytes(header),
      (p) => progress.push(p),
    );
    expect(
      await crypt("decrypt", header, secret.replace("é", "e\u0301"), cipher),
    ).toEqual(new Uint8Array([3, 4, 5]));
    expect(progress.length).toBeGreaterThan(1);
    expect(
      progress.every(
        (p, i) => p >= 0 && p <= 1 && (!i || p >= progress[i - 1]),
      ),
    ).toBe(true);
    await expect(
      crypt("decrypt", header, "another long but incorrect phrase", cipher),
    ).rejects.toThrow();
  }, 20000);
  it("binds carrier audio to the encrypted payload", async () => {
    const header = await h(),
      key = generateKey(),
      cipher = await crypt("encrypt", header, key, new Uint8Array([5]));
    const p = {
      original: original.slice(),
      header,
      aad: headerBytes(header),
      ciphertext: cipher,
    };
    expect(await decryptPackage(p, key)).toEqual(new Uint8Array([5]));
    p.original[0] ^= 1;
    await expect(decryptPackage(p, key)).rejects.toThrow();
    const rehashed = { ...header, carrierHash: await fileHash(p.original) };
    await expect(
      decryptPackage(
        { ...p, header: rehashed, aad: headerBytes(rehashed) },
        key,
      ),
    ).rejects.toThrow();
  });
  it("matches the RFC 9106 Argon2id test vector (independent published expected tag)", () => {
    const actual = argon2id(
      new Uint8Array(32).fill(1),
      new Uint8Array(16).fill(2),
      {
        p: 4,
        m: 32,
        t: 3,
        version: 19,
        dkLen: 32,
        key: new Uint8Array(8).fill(3),
        personalization: new Uint8Array(12).fill(4),
      },
    );
    expect(Buffer.from(actual).toString("hex")).toBe(
      "0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659",
    );
  });
});
