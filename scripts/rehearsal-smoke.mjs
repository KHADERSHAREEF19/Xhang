/* global window, document */
// Run npm run build + npm run preview first. Real AudioContext time, no test bridge.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    Reflect.set(window, "__cspViolations", []);
    document.addEventListener("securitypolicyviolation", (event) =>
      Reflect.get(window, "__cspViolations").push(event.violatedDirective),
    );
  });
  await page.goto("http://localhost:4173/#hide");
  await page.waitForLoadState("networkidle");
  assert.equal(
    await page.evaluate(() => typeof window.__xhangTest),
    "undefined",
  );
  assert.equal(await page.evaluate(() => window.isSecureContext), true);
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await context.setOffline(true);
  await page.locator("#use-demo").click();
  await page.locator("#song-result .file-chip").waitFor();
  await page.locator("#hide-next").click();
  await page.locator("#message").fill("Production rehearsal verification.");
  await page.locator("#hide-next").click();
  const key = await page.locator("#sender-key").inputValue();
  await page.locator("#saved-secret").check();
  await page.locator("#hide-next").click();
  assert.equal(await page.locator("#rehearsal-secret").isVisible(), true);
  assert.equal(await page.locator("#rehearsal-secret").isDisabled(), true);
  async function rehearse(secret) {
    await page.locator("#rehearse").click();
    await page.locator("#rehearsal-secret:enabled").waitFor({ timeout: 30000 });
    assert.match(
      await page.locator("#rehearsal-status").textContent(),
      /Audio is playing/,
    );
    await page.locator("#rehearsal-secret").fill(secret);
    await page.locator("#rehearsal-secret").press("Enter");
    await page
      .getByText("Rehearsal passed. Your encrypted file is ready. ✓", {
        exact: true,
      })
      .waitFor({ timeout: 30000 });
  }
  await rehearse(key);
  await page.locator("#hide-back").click();
  await page.locator("#mode-passphrase").click();
  const passphrase = "velvet river copper lantern meadow orbit";
  await page.locator("#sender-passphrase").fill(passphrase);
  await page.locator("#saved-secret").check();
  await page.locator("#hide-next").click();
  await rehearse(passphrase);
  await page.locator("#hide-next").click();
  const download = page.waitForEvent("download");
  await page.locator("#download").click();
  assert.match((await download).suggestedFilename(), /\.xhang\.wav$/);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  assert.deepEqual(
    await page.evaluate(() => Reflect.get(window, "__cspViolations")),
    [],
  );
  console.log(
    "Step 4 production smoke passed: real countdown + early submission, generated key + Argon2id, no playground interaction, offline, strict CSP, no post-load HTTP requests.",
  );
} finally {
  await browser.close();
}
