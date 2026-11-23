import { argon2idAsync } from "@noble/hashes/argon2.js";
import { ownedBuffer } from "../core/credentials";
import { ARGON2, type Kdf } from "./format";
export async function deriveAesKey(
  kdf: Kdf,
  secret: Uint8Array,
  salt: Uint8Array,
  usage: KeyUsage,
  progress?: (fraction: number) => void,
): Promise<CryptoKey> {
  if (salt.length !== 16) throw new Error("Nothing unlocked.");
  if (kdf.name === "HKDF-SHA256") {
    if (secret.length !== 32 || Object.keys(kdf).length !== 1)
      throw new Error("Nothing unlocked.");
    const material = await crypto.subtle.importKey(
      "raw",
      ownedBuffer(secret),
      "HKDF",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: ownedBuffer(salt),
        info: new TextEncoder().encode("xhang/v3/aes-256-gcm"),
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      [usage],
    );
  }
  if (
    Object.keys(kdf).length !== Object.keys(ARGON2).length ||
    Object.entries(ARGON2).some(
      ([k, v]) => (kdf as unknown as Record<string, unknown>)[k] !== v,
    ) ||
    !secret.length ||
    secret.length > 4096
  )
    throw new Error("Nothing unlocked.");
  const derived = await argon2idAsync(secret, salt, {
    m: ARGON2.memory,
    t: ARGON2.iterations,
    p: ARGON2.parallelism,
    version: ARGON2.version,
    dkLen: 32,
    maxmem: 80 * 1024 * 1024,
    asyncTick: 16,
    personalization: new TextEncoder().encode("xhang/v3/passphrase"),
    onProgress: progress,
  });
  try {
    return await crypto.subtle.importKey(
      "raw",
      ownedBuffer(derived),
      { name: "AES-GCM" },
      false,
      [usage],
    );
  } finally {
    derived.fill(0);
  }
}
