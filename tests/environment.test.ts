import { describe, it, expect } from "vitest";
import {
  cryptoSetupIssue,
  rehearsalSetupFailure,
} from "../src/core/environment";
describe("rehearsal setup, not a wrong secret", () => {
  it("explains insecure HTTP before any encryption attempt", () => {
    expect(cryptoSetupIssue({ isSecureContext: false, crypto: {} })).toContain(
      "HTTP LAN/IP",
    );
    expect(cryptoSetupIssue({ isSecureContext: false, crypto: {} })).toContain(
      "HTTPS",
    );
  });
  it("detects a secure browser without Web Crypto", () => {
    expect(cryptoSetupIssue({ isSecureContext: true })).toContain(
      "Web Crypto is unavailable",
    );
  });
  it("accepts available Web Crypto on a trusted origin", () => {
    expect(
      cryptoSetupIssue({ isSecureContext: true, crypto: { subtle: {} } }),
    ).toBeUndefined();
  });
  it.each(["audio", "encryption", "playback"] as const)(
    "does not label %s setup failure as a wrong credential",
    (phase) => {
      expect(rehearsalSetupFailure(phase)).toContain(
        "Rehearsal could not start.",
      );
      expect(rehearsalSetupFailure(phase)).not.toContain("Nothing unlocked");
    },
  );
});
