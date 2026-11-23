export type CredentialMode = "key" | "passphrase";
export function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
export function generateKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  try {
    return (
      "xk3_" +
      btoa(String.fromCharCode(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "")
    );
  } finally {
    bytes.fill(0);
  }
}
export function decodeKey(input: string): Uint8Array {
  const text = input.trim();
  if (!/^xk3_[A-Za-z0-9_-]{43}$/.test(text))
    throw new Error("Nothing unlocked.");
  const raw = atob(
    text.slice(4).replaceAll("-", "+").replaceAll("_", "/") + "=",
  );
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  // Reject noncanonical trailing bits instead of accepting several spellings.
  const canonical = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (bytes.length !== 32 || canonical !== text.slice(4)) {
    bytes.fill(0);
    throw new Error("Nothing unlocked.");
  }
  return bytes;
}
export function passphraseStrength(value: string): {
  ok: boolean;
  text: string;
} {
  const text = value.normalize("NFC");
  if (text.length < 24 || text.length > 1024 || new Set(text).size < 8)
    return {
      ok: false,
      text: "Use a long passphrase (24–1024 characters), ideally randomly chosen words. Names and short passwords such as Justin are not accepted.",
    };
  if (/(.{1,12})\1\1/.test(text))
    return {
      ok: false,
      text: "Avoid repeated patterns. Use independent random words or the generated-key option.",
    };
  return {
    ok: true,
    text: "Length check passed—not an entropy guarantee. Generated keys are recommended; an invented sentence may still be guessable.",
  };
}
export function generatePassphrase(): string {
  // Uniform random lowercase letters, grouped for readability; not a word-list claim.
  const letters: string[] = [];
  while (letters.length < 32) {
    for (const b of crypto.getRandomValues(new Uint8Array(64)))
      if (b < 234 && letters.length < 32)
        letters.push(String.fromCharCode(97 + (b % 26)));
  }
  return letters.join("").match(/.{8}/g)!.join(" ");
}
