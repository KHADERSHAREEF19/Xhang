import { decodeKey } from "../core/credentials";
import {
  headerBytes,
  validateHeader,
  type Header,
  type ParsedFile,
} from "./format";
import { verifyCarrier } from "./carrier";
import { runCrypto, type CryptoJob } from "./operations";
let id = 0,
  broken = false;
const pending = new Map<
  number,
  {
    resolve: (v: Uint8Array) => void;
    reject: (e: Error) => void;
    progress?: (fraction: number) => void;
  }
>();
// Eager, bundled worker: no runtime CDN, WASM, or post-load worker fetches.
const worker =
  typeof Worker === "undefined"
    ? undefined
    : new Worker(new URL("./kdf.worker.ts", import.meta.url), {
        type: "module",
      });
if (worker) {
  worker.onmessage = (
    e: MessageEvent<{
      id: number;
      kind: "progress" | "result";
      fraction?: number;
      ok?: boolean;
      result: Uint8Array;
    }>,
  ) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    if (e.data.kind === "progress") {
      job.progress?.(e.data.fraction ?? 0);
      return;
    }
    pending.delete(e.data.id);
    if (e.data.ok) job.resolve(e.data.result);
    else job.reject(new Error("Nothing unlocked."));
  };
  worker.onerror = () => {
    broken = true;
    for (const job of pending.values())
      job.reject(new Error("Nothing unlocked."));
    pending.clear();
  };
}
export async function crypt(
  mode: "encrypt" | "decrypt",
  header: Header,
  credential: string,
  data: Uint8Array,
  aad = headerBytes(header),
  progress?: (fraction: number) => void,
): Promise<Uint8Array> {
  validateHeader(header);
  if (broken || credential.length > 1024) throw new Error("Nothing unlocked.");
  const secret =
    header.kdf.name === "HKDF-SHA256"
      ? decodeKey(credential)
      : new TextEncoder().encode(credential.normalize("NFC"));
  const job: CryptoJob = {
    mode,
    secret,
    kdf: header.kdf,
    salt: new Uint8Array(header.salt),
    iv: new Uint8Array(header.iv),
    aad: aad.slice(),
    data: data.slice(),
  };
  if (!worker) return runCrypto(job, progress);
  return new Promise((resolve, reject) => {
    const request = ++id;
    pending.set(request, { resolve, reject, progress });
    try {
      worker.postMessage({ id: request, job });
    } catch {
      pending.delete(request);
      reject(new Error("Nothing unlocked."));
    } finally {
      secret.fill(0);
      job.data.fill(0);
    }
  });
}
export async function decryptPackage(
  file: ParsedFile,
  credential: string,
  progress?: (fraction: number) => void,
): Promise<Uint8Array> {
  await verifyCarrier(file);
  return crypt(
    "decrypt",
    file.header,
    credential,
    file.ciphertext,
    file.aad,
    progress,
  );
}
