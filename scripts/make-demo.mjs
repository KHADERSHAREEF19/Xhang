// Build-time only. The shipped files are local assets, not runtime requests to a service.
import { writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { webcrypto as crypto } from "node:crypto";
const rate = 22050,
  seconds = 25,
  n = rate * seconds;
const pcm = Buffer.alloc(n * 2);
const chords = [
  [130.81, 164.81, 196],
  [110, 130.81, 164.81],
  [87.31, 110, 130.81],
  [98, 123.47, 146.83],
];
for (let i = 0; i < n; i++) {
  const t = i / rate;
  const chord = chords[Math.floor(t / 4) % 4];
  let value = 0;
  for (let j = 0; j < chord.length; j++) {
    const phase = t * chord[j] * Math.PI * 2;
    value += Math.sin(phase) * 0.045 + Math.sin(phase * 2) * 0.012;
  }
  const beat = t % 0.5;
  value +=
    Math.sin(2 * Math.PI * (50 * beat + 1.5 * (1 - Math.exp(-beat * 30)))) *
    Math.exp(-beat * 18) *
    0.15;
  const step = Math.floor(t * 4);
  const melody = chord[step % 3] * Math.pow(2, step % 7 === 0 ? 2 : 1);
  const env = Math.exp(-(t % 0.25) * 12);
  value += Math.sin(t * melody * 2 * Math.PI) * env * 0.07;
  value *= Math.min(1, t, seconds - t);
  pcm.writeInt16LE(
    Math.max(-32767, Math.min(32767, Math.round(value * 32767))),
    i * 2,
  );
}
const wav = Buffer.alloc(44 + pcm.length);
wav.write("RIFF");
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(pcm.length, 40);
pcm.copy(wav, 44);
writeFileSync("public/demo.wav", wav);
const publicRootKey = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const carrierHash = Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", wav)),
  (b) => b.toString(16).padStart(2, "0"),
).join("");
const header = {
  version: 3,
  salt: Array.from(crypto.getRandomValues(new Uint8Array(16))),
  iv: Array.from(crypto.getRandomValues(new Uint8Array(12))),
  mime: "text/plain",
  carrierHash,
  kdf: { name: "HKDF-SHA256" },
};
const aad = Buffer.from(JSON.stringify(header));
const material = await crypto.subtle.importKey(
  "raw",
  publicRootKey,
  "HKDF",
  false,
  ["deriveKey"],
);
const key = await crypto.subtle.deriveKey(
  {
    name: "HKDF",
    hash: "SHA-256",
    salt: new Uint8Array(header.salt),
    info: Buffer.from("xhang/v3/aes-256-gcm"),
  },
  material,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const cipher = Buffer.from(
  await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(header.iv),
      additionalData: aad,
      tagLength: 128,
    },
    key,
    Buffer.from("Some things sound better between friends. ✨"),
  ),
);
publicRootKey.fill(0);
const block = Buffer.alloc(4 + aad.length + cipher.length);
block.writeUInt32LE(aad.length);
aad.copy(block, 4);
cipher.copy(block, 4 + aad.length);
const footer = Buffer.alloc(16);
footer.writeBigUInt64LE(BigInt(block.length));
footer.write("XHANGv3\0", 8);
writeFileSync("public/demo.xhang.wav", Buffer.concat([wav, block, footer]));
