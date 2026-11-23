/** Public capability checks only: never inspect or expose a credential. */
export interface CryptoEnvironment {
  isSecureContext?: boolean;
  crypto?: { subtle?: unknown };
}
export function cryptoSetupIssue(
  environment: CryptoEnvironment = globalThis,
): string | undefined {
  if (environment.isSecureContext === false) {
    return "Cryptography is blocked on this insecure address. Open http://localhost:5173 on this computer, or use the deployed HTTPS URL. An HTTP LAN/IP address is not supported. No API key or Python installation will fix an insecure context.";
  }
  if (!environment.crypto?.subtle) {
    return "Web Crypto is unavailable in this browser. Open xhang directly in a current browser on localhost or HTTPS, not in an editor preview. No API key or Python package is required.";
  }
  return undefined;
}
export type RehearsalSetupPhase = "audio" | "encryption" | "playback";
export function rehearsalSetupFailure(phase: RehearsalSetupPhase): string {
  const reason = {
    audio:
      "Audio could not start. Allow site audio, keep this page active, and click Start full rehearsal again.",
    encryption:
      "Local encryption failed before playback. Reload this page; if it persists, check Console for a blocked or missing crypto worker, browser restrictions, or an out-of-memory error. Do not weaken the CSP.",
    playback:
      "The rehearsal track could not start. Reload the carrier audio and try again in the active tab.",
  }[phase];
  return `Rehearsal could not start. ${reason}`;
}
