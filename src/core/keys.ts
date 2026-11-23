import { DICTIONARY } from "./words";
export interface Letter {
  code: string;
  shift: boolean;
}
export const CODES = Array.from(
  { length: 26 },
  (_, i) => `Key${String.fromCharCode(65 + i)}`,
);
export const label = (key: Letter) =>
  `${key.code.slice(3)}${key.shift ? "↑" : ""}`;
export function canonical(keys: readonly Letter[]): string {
  if (keys.some((k) => !CODES.includes(k.code) || typeof k.shift !== "boolean"))
    throw new Error("Invalid letters");
  return keys.map((k) => `${k.code}:${k.shift ? 1 : 0}`).join("|");
}
export function strength(keys: readonly Letter[]): {
  ok: boolean;
  text: string;
} {
  if (keys.length < 8)
    return { ok: false, text: "Use at least 8 letters. Random is stronger." };
  const word = keys.map((k) => k.code.slice(3).toLowerCase()).join("");
  const weak =
    DICTIONARY.has(word) ||
    /password|keyboard|qwerty|asdf|secret|letmein|abcdefgh|iloveyou|sunshine|welcome|monkey|dragon|football|princess|trustnoone|xhang/.test(
      word,
    );
  const repeated =
    new Set(keys.map((k) => `${k.code}${k.shift}`)).size < 5 ||
    /(.{1,6})\1\1/.test(word) ||
    Array.from({ length: Math.floor(word.length / 2) }, (_, i) => i + 1).some(
      (n) =>
        word.length % n === 0 &&
        word === word.slice(0, n).repeat(word.length / n),
    );
  return {
    ok: !weak && !repeated,
    text:
      weak || repeated
        ? "Avoid words and repeated patterns. Generate random letters instead."
        : "Good length. Only truly random letters provide strong protection.",
  };
}
export function randomLetters(count = 10): Letter[] {
  const result: Letter[] = [];
  while (result.length < count) {
    const bytes = crypto.getRandomValues(new Uint8Array(count * 2));
    for (const b of bytes) {
      if (b < 234 && result.length < count)
        result.push({ code: CODES[b % 26], shift: false });
    }
  }
  return result;
}
export interface VisualHit {
  code: string;
  color: string;
  intensity: number;
}
// No correctness parameter: feedback cannot leak a per-letter oracle.
export function visualHit(code: string, insideWindow: boolean): VisualHit {
  return {
    code,
    color: ["#b399ff", "#56e5dd", "#ff9bd4", "#a3f3a1"][
      Math.max(0, CODES.indexOf(code)) % 4
    ],
    intensity: insideWindow ? 1 : 0.25,
  };
}
