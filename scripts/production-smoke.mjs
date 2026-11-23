/* global window, document, Event, innerWidth */
// Run npm run build + npm run preview first. No fake clock in this check.
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";
import { Buffer } from "node:buffer";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import assert from "node:assert/strict";
const publicKey = "xk3_AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";
function clipWav(source, seconds) {
  const result = Buffer.from(source.subarray(0, 44 + 22050 * 2 * seconds));
  result.writeUInt32LE(result.length - 8, 4);
  result.writeUInt32LE(result.length - 44, 40);
  return result;
}
async function voicePackage() {
  const original = clipWav(await readFile("public/demo.wav"), 8),
    voice = clipWav(original, 4),
    passphrase = "velvet river copper lantern meadow orbit";
  const header = {
    version: 3,
    salt: Array.from(crypto.getRandomValues(new Uint8Array(16))),
    iv: Array.from(crypto.getRandomValues(new Uint8Array(12))),
    mime: "audio/wav",
    carrierHash: Buffer.from(
      await crypto.subtle.digest("SHA-256", original),
    ).toString("hex"),
    kdf: {
      name: "Argon2id",
      memory: 65536,
      iterations: 3,
      parallelism: 1,
      version: 19,
    },
  };
  const aad = Buffer.from(JSON.stringify(header));
  const raw = await argon2idAsync(passphrase, new Uint8Array(header.salt), {
    m: 65536,
    t: 3,
    p: 1,
    version: 19,
    dkLen: 32,
    maxmem: 80 * 1024 * 1024,
    personalization: Buffer.from("xhang/v3/passphrase"),
  });
  const key = await crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  raw.fill(0);
  const cipher = Buffer.from(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(header.iv),
        additionalData: aad,
        tagLength: 128,
      },
      key,
      voice,
    ),
  );
  const block = Buffer.alloc(4 + aad.length + cipher.length);
  block.writeUInt32LE(aad.length);
  aad.copy(block, 4);
  cipher.copy(block, 4 + aad.length);
  const tail = Buffer.alloc(16);
  tail.writeBigUInt64LE(BigInt(block.length));
  tail.write("XHANGv3\0", 8);
  return { bytes: Buffer.concat([original, block, tail]), voice, passphrase };
}
const fixture = await voicePackage();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage(),
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__violations.push(e.violatedDirective),
    );
  });
  await page.goto("http://localhost:4173/#unlock");
  await page.waitForLoadState("networkidle");
  assert.equal(
    await page.locator('meta[http-equiv="Content-Security-Policy"]').count(),
    1,
  );
  assert.equal(
    await page.evaluate(() => typeof window.__xhangTest),
    "undefined",
  );
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await context.setOffline(true);
  await page.locator("#practice").click();
  await page.locator("#start-unlock").click();
  await page.locator("#unlock-secret:enabled").waitFor();
  await page.locator("#unlock-secret").fill(publicKey);
  assert.equal(await page.locator("#secret-text").count(), 0);
  await page.locator("#unlock-secret").press("Enter");
  await page.locator("#secret-text").waitFor();
  assert.match(
    await page.locator("#secret-text").textContent(),
    /between friends/,
  );
  // Pure-JS Argon2id succeeds under unchanged strict CSP, not just on the dev server.
  await page.locator("#package").setInputFiles({
    name: "voice.xhang.wav",
    mimeType: "audio/wav",
    buffer: fixture.bytes,
  });
  await page.locator("#start-unlock").click();
  await page.locator("#unlock-secret:enabled").waitFor();
  await page.locator("#unlock-secret").fill(fixture.passphrase);
  await page.locator("#unlock-secret").press("Enter");
  await page.locator("#voice-secret").waitFor({ timeout: 30000 });
  const d = page.waitForEvent("download");
  await page.locator("#download-voice").click();
  const recovered = await readFile(await (await d).path());
  assert.equal(recovered.equals(fixture.voice), true);
  // Public practice verifies interruption failure independently of submission.
  await page.locator("#practice").click();
  await page.locator("#start-unlock").click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page
    .getByRole("heading", { name: "Nothing unlocked.", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(await page.evaluate(() => window.__violations), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  console.log(
    "Production smoke passed: real-clock early submission; HKDF text + Argon2id voice; original bytes; strict CSP; no post-load network; blur; mobile.",
  );
} finally {
  await browser.close();
}
