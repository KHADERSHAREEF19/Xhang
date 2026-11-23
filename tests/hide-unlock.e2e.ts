import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseFile } from "../src/crypto/format";
interface Bridge {
  time(ms: number): void;
  state(): { session: string; step: number; duration: number };
}
declare global {
  interface Window {
    __xhangTest: Bridge;
  }
}
async function time(page: Page, ms: number) {
  await page.evaluate((t) => window.__xhangTest.time(t), ms);
}
async function ready(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__xhangTest.state().session))
    .toBe("running");
  await time(page, 0);
}
async function getDownload(page: Page, selector: string) {
  const promise = page.waitForEvent("download");
  await page.locator(selector).click();
  const d = await promise;
  return readFile((await d.path())!);
}
async function toMessage(page: Page) {
  await page.locator("#use-demo").click();
  await expect(page.locator(".file-chip")).toContainText("ready");
  await page.locator("#hide-next").click();
}
async function saved(page: Page) {
  await page.locator("#saved-secret").check();
  await page.locator("#hide-next").click();
}
async function rehearse(page: Page, secret: string) {
  await page.locator("#rehearse").click();
  await ready(page);
  await time(page, 700);
  await page.locator("#rehearsal-secret").fill(secret);
  await page.locator("#rehearsal-secret").press("Enter");
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Rehearsal passed",
  );
  expect(await page.evaluate(() => window.__xhangTest.state().session)).toBe(
    "submitted",
  );
}
test("offline v3: generated-key text + Argon2id original voice, explicit early submission, no length hints, one-shot lock", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#hide");
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  await toMessage(page);
  await page.locator("#message").fill("Meet me where the music ends.");
  await page.locator("#hide-next").click();
  const key = await page.locator("#sender-key").inputValue();
  expect(key).toMatch(/^xk3_/);
  await saved(page);
  // Wrong submission fails immediately, not after the song, with no partial feedback.
  await page.locator("#rehearse").click();
  await ready(page);
  await page.locator("#rehearsal-secret").fill("xk3_" + "A".repeat(43));
  await expect(page.locator("#rehearsal-status")).not.toContainText(
    "Nothing unlocked.",
  );
  await page.locator("#rehearsal-secret").press("Enter");
  await expect(page.locator("#rehearsal-status")).toHaveText(
    "Nothing unlocked.",
  );
  await rehearse(page, key);
  await page.locator("#hide-next").click();
  const textPackage = await getDownload(page, "#download");
  const p = parseFile(new Uint8Array(textPackage));
  expect(p.header.kdf.name).toBe("HKDF-SHA256");
  expect(Object.keys(p.header).sort()).toEqual(
    ["version", "salt", "iv", "mime", "carrierHash", "kdf"].sort(),
  );
  await page.locator('[data-tab="unlock"]').click();
  await page.locator("#package").setInputFiles({
    name: "shared.xhang.wav",
    mimeType: "audio/wav",
    buffer: textPackage,
  });
  await expect(page.locator("#start-unlock")).toBeEnabled();
  await expect(page.locator("#unlock-config")).not.toContainText(
    /\b\d+\s+(letters|cues|keys)\b/i,
  );
  await expect(page.locator("#cue-progress,#latency")).toHaveCount(0);
  // Full appended file still decodes as playable WAV.
  expect(
    await page.evaluate(async () => {
      const file =
        document.querySelector<HTMLInputElement>("#package")!.files![0];
      const a = new AudioContext();
      try {
        return (await a.decodeAudioData(await file.arrayBuffer())).duration;
      } finally {
        await a.close();
      }
    }),
  ).toBe(25);
  await page.locator("#start-unlock").click();
  await ready(page);
  await time(page, 1917);
  await page.locator("#unlock-secret").fill(key);
  await expect(page.locator("#secret-text")).toHaveCount(0);
  await page.locator("#unlock-secret").press("Enter");
  await expect(page.locator("#secret-text")).toHaveText(
    "Meet me where the music ends.",
  );
  expect(await page.evaluate(() => window.__xhangTest.state().session)).toBe(
    "submitted",
  );
  await page.locator("#package").setInputFiles({
    name: "shared.xhang.wav",
    mimeType: "audio/wav",
    buffer: textPackage,
  });
  await expect(page.locator("#start-unlock")).toBeDisabled();
  // Create a four-second original audio payload with a valid WAV header.
  const demo = await readFile("public/demo.wav"),
    voice = Buffer.from(demo.subarray(0, 44 + 22050 * 2 * 4));
  voice.writeUInt32LE(voice.length - 8, 4);
  voice.writeUInt32LE(voice.length - 44, 40);
  await page.locator('[data-tab="hide"]').click();
  await page.locator("#hide-next").click();
  await toMessage(page);
  await page.locator("#kind-voice").click();
  // Exercise actual MediaRecorder with Chromium's synthetic microphone, then
  // replace that recording with an original uploaded file for byte-for-byte checks.
  await context.grantPermissions(["microphone"]);
  await page.locator("#record-voice").click();
  await expect(page.locator("#voice-status")).toContainText("Recording");
  await page.waitForTimeout(1200); // Intentionally accumulate real recorder frames.
  await page.locator("#record-voice").click();
  await expect(page.locator("#voice-result")).toContainText(
    "My recorded voice note",
  );
  await page.locator("#voice-file").setInputFiles({
    name: "my-original-voice.wav",
    mimeType: "audio/wav",
    buffer: voice,
  });
  await expect(page.locator("#voice-result")).toContainText("4.0s");
  await page.locator("#hide-next").click();
  await page.locator("#mode-passphrase").click();
  await page.locator("#sender-passphrase").fill("Justin");
  await page.locator("#saved-secret").check();
  await page.locator("#hide-next").click();
  await expect(page.locator("#strength-description")).toContainText("24–1024");
  expect(await page.evaluate(() => window.__xhangTest.state().step)).toBe(2);
  const passphrase = "velvet river copper lantern meadow orbit";
  await page.locator("#sender-passphrase").fill(passphrase);
  await saved(page);
  await rehearse(page, passphrase);
  await page.locator("#hide-next").click();
  const voicePackage = await getDownload(page, "#download");
  const v = parseFile(new Uint8Array(voicePackage));
  expect(v.header.kdf.name).toBe("Argon2id");
  expect(v.header.mime).toBe("audio/wav");
  await page.locator('[data-tab="unlock"]').click();
  await page.locator("#package").setInputFiles({
    name: "voice.xhang.wav",
    mimeType: "audio/wav",
    buffer: voicePackage,
  });
  await expect(page.locator("#start-unlock")).toBeEnabled();
  await page.locator("#start-unlock").click();
  await ready(page);
  await time(page, 13471);
  await page.locator("#unlock-secret").fill(passphrase);
  await expect(page.locator("#voice-secret")).toHaveCount(0);
  await page.locator('#unlock-entry button[type="submit"]').click();
  await expect(page.locator("#voice-secret")).toHaveAttribute("src", /^blob:/);
  await expect(page.locator(".unlock-notice")).toContainText(
    "Decryption completed",
  );
  const recovered = await getDownload(page, "#download-voice");
  expect(recovered.equals(voice)).toBe(true);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("xhang-used-v1") || "{}"),
  );
  expect(Object.values(stored)).toEqual([true, true]);
  expect(JSON.stringify(stored)).not.toContain(passphrase);
  expect(JSON.stringify(stored)).not.toContain(key);
  // Authenticity: carrier changes fail generically before entering an attempt.
  const tampered = Buffer.from(voicePackage);
  tampered[100] ^= 1;
  await page.locator("#package").setInputFiles({
    name: "tampered.wav",
    mimeType: "audio/wav",
    buffer: tampered,
  });
  await expect(page.locator("#unlock-result")).toContainText(
    "Nothing unlocked.",
  );
  await expect(page.locator("#start-unlock")).toHaveCount(0);
  await page.locator("#practice").click();
  await expect(page.locator("#start-unlock")).toBeEnabled();
  await page.locator("#start-unlock").click();
  await ready(page);
  await time(page, 25000);
  await expect(page.locator("#unlock-result")).toContainText(
    "Nothing unlocked.",
  );
  await page.locator("#practice-again").click();
  await page.locator("#start-unlock").click();
  await ready(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#unlock-result")).toContainText(
    "Nothing unlocked.",
  );
  expect(errors).toEqual([]);
});
