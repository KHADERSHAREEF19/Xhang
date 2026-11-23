import { test, expect, type Page } from "@playwright/test";
async function stepFour(page: Page, url = "/#hide"): Promise<string> {
  await page.goto(url);
  await page.locator("#use-demo").click();
  await expect(page.locator(".file-chip")).toContainText("ready");
  await page.locator("#hide-next").click();
  await page.locator("#message").fill("Rehearsal setup regression test.");
  await page.locator("#hide-next").click();
  const key = await page.locator("#sender-key").inputValue();
  await page.locator("#saved-secret").check();
  await page.locator("#hide-next").click();
  return key;
}
test("real insecure HTTP explains the environment requirement instead of failing a secret attempt", async ({
  page,
}) => {
  await stepFour(page, "http://xhang-insecure.test:5174/#hide");
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  expect(await page.evaluate(() => !!globalThis.crypto?.subtle)).toBe(false);
  await expect(page.locator("#rehearsal-status")).toContainText(
    "insecure address",
  );
  await expect(page.locator("#rehearsal-status")).toContainText("HTTPS");
  await expect(page.locator("#rehearsal-status")).not.toContainText(
    "Nothing unlocked",
  );
  await expect(page.locator("#rehearse")).toBeDisabled();
  await expect(page.locator("#rehearsal-secret")).toBeVisible();
  await expect(page.locator("#rehearsal-secret")).toBeDisabled();
  expect(
    await page.evaluate(() => window.__xhangTest.state().session),
  ).toBeUndefined();
});
test("a trusted origin with unavailable Web Crypto explains the missing capability", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(globalThis.crypto, "subtle", {
      get: () => undefined,
    }),
  );
  await stepFour(page);
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Web Crypto is unavailable",
  );
  await expect(page.locator("#rehearse")).toBeDisabled();
});
test("audio resumes before encryption; rehearsal works without using the playground", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        Reflect.set(window, "__rehearsalAudio", this);
      }
    };
  });
  const key = await stepFour(page);
  await expect(page.locator("#rehearsal-secret")).toBeVisible();
  await expect(page.locator("#rehearsal-secret")).toBeDisabled();
  await page.evaluate(async () => {
    const context = Reflect.get(window, "__rehearsalAudio") as AudioContext;
    await context.suspend();
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: (...args: Parameters<SubtleCrypto["digest"]>) => {
        document.body.dataset.audioAtEncryption = context.state;
        if (context.state !== "running")
          throw new Error("AudioNotResumedBeforeEncryption");
        return digest(...args);
      },
    });
  });
  await page.locator("#rehearse").click();
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Rehearsal starts in 3",
  );
  expect(
    await page.locator("body").getAttribute("data-audio-at-encryption"),
  ).toBe("running");
  await expect(page.locator("#rehearsal-secret")).toBeDisabled();
  await page.evaluate(() => window.__xhangTest.time(0));
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Audio is playing",
  );
  await page.locator("#rehearsal-secret").fill(key);
  await page.locator("#rehearsal-secret").press("Enter");
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Rehearsal passed",
  );
});
test("encryption setup errors are actionable and allow retry without a false wrong-secret result", async ({
  page,
}) => {
  const key = await stepFour(page);
  await page.evaluate(() =>
    Object.defineProperty(crypto.subtle, "digest", {
      configurable: true,
      value: () =>
        Promise.reject(
          new DOMException("Injected test failure", "OperationError"),
        ),
    }),
  );
  await page.locator("#rehearse").click();
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Local encryption failed before playback",
  );
  await expect(page.locator("#rehearsal-status")).not.toContainText(
    "Nothing unlocked",
  );
  await expect(page.locator("#rehearsal-secret")).toBeDisabled();
  expect(
    await page.evaluate(() => window.__xhangTest.state().session),
  ).toBeUndefined();
  await page.evaluate(() => Reflect.deleteProperty(crypto.subtle, "digest"));
  await page.locator("#rehearse").click();
  await expect
    .poll(() => page.evaluate(() => window.__xhangTest.state().session))
    .toBe("running");
  await page.evaluate(() => window.__xhangTest.time(100));
  await page.locator("#rehearsal-secret").fill(key);
  await page.locator("#rehearsal-secret").press("Enter");
  await expect(page.locator("#rehearsal-status")).toContainText(
    "Rehearsal passed",
  );
});
