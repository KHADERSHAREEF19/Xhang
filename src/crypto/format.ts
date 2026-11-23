import { ownedBuffer } from "../core/credentials";
export const MAGIC = new TextEncoder().encode("XHANGv3\0");
export const MAX_AUDIO = 50 * 1024 * 1024;
export const MAX_PAYLOAD = 10 * 1024 * 1024;
export const ARGON2 = {
  name: "Argon2id",
  memory: 65536,
  iterations: 3,
  parallelism: 1,
  version: 19,
} as const;
export type Kdf = { name: "HKDF-SHA256" } | typeof ARGON2;
export interface Header {
  version: 3;
  salt: number[];
  iv: number[];
  mime: string;
  carrierHash: string;
  kdf: Kdf;
}
const FIELDS = ["version", "salt", "iv", "mime", "carrierHash", "kdf"];
export function validateHeader(h: Header): void {
  const bytes = (v: unknown, n: number) =>
    Array.isArray(v) &&
    v.length === n &&
    v.every((x) => Number.isInteger(x) && x >= 0 && x <= 255);
  if (
    !h ||
    h.version !== 3 ||
    Object.keys(h).length !== FIELDS.length ||
    Object.keys(h).some((k) => !FIELDS.includes(k)) ||
    !bytes(h.salt, 16) ||
    !bytes(h.iv, 12) ||
    typeof h.carrierHash !== "string" ||
    !/^[a-f0-9]{64}$/.test(h.carrierHash) ||
    typeof h.mime !== "string" ||
    (h.mime !== "text/plain" &&
      !/^audio\/(mpeg|wav|ogg|webm|mp4)(;codecs=[a-zA-Z0-9.,-]+)?$/.test(
        h.mime,
      )) ||
    !h.kdf ||
    typeof h.kdf !== "object"
  )
    throw new Error("Invalid header");
  if (h.kdf.name === "HKDF-SHA256") {
    if (Object.keys(h.kdf).length !== 1) throw new Error("Invalid KDF");
  } else if (h.kdf.name === "Argon2id") {
    const actual = h.kdf as unknown as Record<string, unknown>;
    if (
      Object.keys(actual).length !== Object.keys(ARGON2).length ||
      Object.entries(ARGON2).some(([k, v]) => actual[k] !== v)
    )
      throw new Error("Invalid KDF");
  } else throw new Error("Invalid KDF");
}
export function headerBytes(h: Header): Uint8Array {
  validateHeader(h);
  return new TextEncoder().encode(JSON.stringify(h));
}
export interface ParsedFile {
  original: Uint8Array;
  header: Header;
  aad: Uint8Array;
  ciphertext: Uint8Array;
}
export function embed(
  original: Uint8Array,
  aad: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (
    !original.length ||
    original.length > MAX_AUDIO ||
    aad.length > 65536 ||
    ciphertext.length < 16 ||
    ciphertext.length > MAX_PAYLOAD + 16
  )
    throw new Error("File too large");
  const blockSize = 4 + aad.length + ciphertext.length,
    result = new Uint8Array(original.length + blockSize + 16);
  result.set(original);
  const view = new DataView(result.buffer);
  view.setUint32(original.length, aad.length, true);
  result.set(aad, original.length + 4);
  result.set(ciphertext, original.length + 4 + aad.length);
  view.setBigUint64(result.length - 16, BigInt(blockSize), true);
  result.set(MAGIC, result.length - 8);
  return result;
}
export function parseFile(bytes: Uint8Array): ParsedFile {
  if (
    bytes.length < 24 ||
    bytes.length > MAX_AUDIO + MAX_PAYLOAD + 65568 ||
    MAGIC.some((b, i) => bytes[bytes.length - 8 + i] !== b)
  )
    throw new Error("Invalid file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    length = view.getBigUint64(bytes.length - 16, true);
  if (length > BigInt(bytes.length - 16) || length < 22n)
    throw new Error("Invalid length");
  const start = bytes.length - 16 - Number(length),
    hl = view.getUint32(start, true);
  if (
    hl > 65536 ||
    hl + 20 > Number(length) ||
    start === 0 ||
    start > MAX_AUDIO
  )
    throw new Error("Invalid framing");
  const aad = bytes.slice(start + 4, start + 4 + hl),
    header = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(aad),
    ) as Header;
  validateHeader(header);
  const ciphertext = bytes.slice(start + 4 + hl, bytes.length - 16);
  if (ciphertext.length > MAX_PAYLOAD + 16) throw new Error("Invalid payload");
  return { original: bytes.slice(0, start), header, aad, ciphertext };
}
export async function fileHash(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", ownedBuffer(bytes))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
