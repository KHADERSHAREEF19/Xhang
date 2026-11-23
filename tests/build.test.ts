import { it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { CSP } from "../vite.config";
it("injects the exact strict CSP into production index.html only", () => {
  const built = readFileSync("dist/index.html", "utf8").replaceAll(
    "&#39;",
    "'",
  );
  expect(built).toContain('http-equiv="Content-Security-Policy"');
  expect(built).toContain(`content="${CSP}"`);
  expect(readFileSync("index.html", "utf8")).not.toContain(
    "Content-Security-Policy",
  );
  expect(built).not.toMatch(/<script[^>]*>\s*[^<\s]/);
  expect(built).not.toMatch(/https?:\/\//);
  expect(built).toContain("./assets/");
});
it("removes the test-only deterministic clock bridge from production", () => {
  const javascript = readdirSync("dist/assets")
    .filter((x) => x.endsWith(".js"))
    .map((x) => readFileSync(`dist/assets/${x}`, "utf8"))
    .join("");
  expect(javascript).not.toContain("__xhangTest");
});
