import { ownedBuffer } from "../core/credentials";
import { deriveAesKey } from "./kdf";
import type { Kdf } from "./format";
export interface CryptoJob {
  mode: "encrypt" | "decrypt";
  secret: Uint8Array;
  kdf: Kdf;
  salt: Uint8Array;
  iv: Uint8Array;
  aad: Uint8Array;
  data: Uint8Array;
}
export async function runCrypto(
  job: CryptoJob,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> {
  try {
    const key = await deriveAesKey(
      job.kdf,
      job.secret,
      job.salt,
      job.mode,
      progress,
    );
    const algorithm = {
      name: "AES-GCM",
      iv: ownedBuffer(job.iv),
      additionalData: ownedBuffer(job.aad),
      tagLength: 128,
    };
    return new Uint8Array(
      await (job.mode === "encrypt"
        ? crypto.subtle.encrypt(algorithm, key, ownedBuffer(job.data))
        : crypto.subtle.decrypt(algorithm, key, ownedBuffer(job.data))),
    );
  } finally {
    job.secret.fill(0);
    job.data.fill(0);
  }
}
