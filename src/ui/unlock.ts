import { audio } from "../audio/engine";
import { runner } from "../core/runner";
import { ownedBuffer } from "../core/credentials";
import { demoPackage, DEMO_SECRET } from "../core/demo";
import { wasUsed, markUsed } from "../core/attempts";
import { decryptPackage } from "../crypto";
import { verifyCarrier } from "../crypto/carrier";
import {
  parseFile,
  fileHash,
  MAX_AUDIO,
  MAX_PAYLOAD,
  type ParsedFile,
} from "../crypto/format";
import {
  $,
  escape,
  toast,
  busy,
  kdfProgress,
  uploadZone,
  bindUpload,
  icons,
} from "./dom";
import { SecretEntry } from "./entry";
import type { Studio } from "./types";
export class UnlockFlow {
  parsed?: ParsedFile;
  buffer?: AudioBuffer;
  hash = "";
  file?: File;
  practice = false;
  busy = false;
  used = false;
  private attempted = "";
  private entry?: SecretEntry;
  private voiceUrl?: string;
  private secret?: Uint8Array;
  constructor(
    private root: HTMLElement,
    private studio: Studio,
  ) {}
  mount(): void {
    this.render();
    if (this.buffer) this.studio.load(this.buffer, this.file!.name);
  }
  unmount(): void {
    this.entry?.clear();
    this.entry = undefined;
    this.attempted = "";
    this.secret?.fill(0);
    this.secret = undefined;
    if (this.voiceUrl) URL.revokeObjectURL(this.voiceUrl);
    this.voiceUrl = undefined;
  }
  update(): void {
    this.entry?.update();
  }
  appendSecret(char: string): void {
    this.entry?.append(char);
  }
  private render(): void {
    this.root.innerHTML = `<div class="page-heading"><div><p class="eyebrow">A SECRET VOICE IS WAITING</p><h1 class="page-title">Play. <span>Unlock. Listen.</span></h1></div><span class="local-badge">${icons.lock} Decrypts only on your device</span></div><section class="flow-card card unlock-card"><div class="flow-main"><p class="tiny-label">THE OTHER SIDE OF THE SOUND</p><h2>Bring the file. Keep the secret.</h2><p>Start the carrier audio, enter the key or passphrase at any pace, then press Unlock before playback ends.</p>${uploadZone("package", ".mp3,.wav,.ogg,.m4a", "Drop your encrypted audio here", "Use the original shared Document/file, not a converted copy")}<button class="text-button" id="practice">Try the public practice demo · unlimited retries ${icons.arrow}</button><div id="unlock-config"></div><div id="unlock-entry"></div><div id="unlock-result" role="status" aria-live="polite"></div></div><aside class="flow-aside"><span class="tiny-label">ONE SUBMISSION. NO HINTS.</span><div class="aside-symbol">${icons.lock}</div><h3>Enter at your pace.<br>Unlock when ready.</h3><p>There are no timing targets, expected-length labels, per-letter checks, or automatic guesses. Only your explicit submission attempts decryption.</p><div class="aside-note"><span>◉</span><span>Copy your secret before starting.<br><small>Switching tabs or leaving the window ends the attempt.</small></span></div><p class="smallprint">The one-try lock and playback deadline are bypassable browser rules—not cryptographic protection. Generated secrets and strong passphrases provide the protection.</p></aside></section>`;
    bindUpload("package", (f) => void this.upload(f, false));
    $("#practice").onclick = () =>
      void demoPackage()
        .then((f) => this.upload(f, true))
        .catch(() => this.failure());
    if (this.parsed) this.config();
  }
  private config(): void {
    const keyMode = this.parsed!.header.kdf.name === "HKDF-SHA256";
    $("#unlock-config").innerHTML =
      `<div class="file-chip"><span>♫ ${escape(this.file!.name)}</span><span>${this.practice ? "PUBLIC PRACTICE" : "CARRIER CHECKED"}</span></div>${this.practice ? `<div class="practice-note"><strong>Public practice key—not for private messages</strong><code class="practice-key">${DEMO_SECRET}</code><button id="copy-demo" class="small">Copy practice key</button><p>Copy first, start playback, paste into the secret field, then press Unlock. Real packages never reveal their secret.</p></div>` : ""}<div class="one-shot-note">${icons.lock}<div><strong>${keyMode ? "Generated-key package · HKDF + AES-256-GCM" : "Passphrase package · Argon2id + AES-256-GCM"}</strong><p>${this.used && !this.practice ? "This browser has already used this file. Nothing unlocked." : "One explicit submission before playback ends. No pause, seek, speed change, or replay. Copy the complete secret before starting."}</p></div></div><button id="start-unlock" class="primary" ${this.used && !this.practice ? "disabled" : ""}>${icons.play} ${this.practice ? "Start practice" : "Start audio & enter secret"}</button>`;
    $("#start-unlock").onclick = () => void this.start();
    if (this.practice)
      $("#copy-demo").onclick = () =>
        void navigator.clipboard
          .writeText(DEMO_SECRET)
          .then(() => toast("Practice key copied."))
          .catch(() =>
            toast("Clipboard unavailable. Select the public key to copy it."),
          );
  }
  private async upload(file: File, practice: boolean): Promise<void> {
    if (this.busy || runner.running) return;
    if (!file.size || file.size > MAX_AUDIO + MAX_PAYLOAD + 65568) {
      this.failure();
      return;
    }
    this.busy = true;
    this.unmount();
    $("#unlock-entry").innerHTML = "";
    $("#unlock-result").innerHTML =
      '<div class="skeleton">Checking the package and carrier locally…</div>';
    try {
      await audio.ready();
      const bytes = new Uint8Array(await file.arrayBuffer()),
        parsed = parseFile(bytes);
      await verifyCarrier(parsed);
      const hash = await fileHash(bytes),
        used = practice ? false : wasUsed(hash),
        buffer = await audio.context.decodeAudioData(
          parsed.original.slice().buffer,
        );
      if (!Number.isFinite(buffer.duration) || buffer.duration <= 0)
        throw new Error();
      this.parsed = parsed;
      this.buffer = buffer;
      this.file = file;
      this.hash = hash;
      this.practice = practice;
      this.used = used;
      this.studio.load(buffer, file.name);
      this.config();
      $("#unlock-result").innerHTML = "";
    } catch {
      this.parsed = undefined;
      this.buffer = undefined;
      $("#unlock-config").innerHTML = "";
      this.failure();
    } finally {
      this.busy = false;
    }
  }
  private async start(): Promise<void> {
    if (!this.parsed || !this.buffer || this.busy || runner.running) return;
    this.busy = true;
    try {
      if (!this.practice) {
        if (wasUsed(this.hash)) throw new Error();
        markUsed(this.hash);
        this.used = true;
      }
      this.root
        .querySelectorAll<HTMLButtonElement>("#unlock-config button")
        .forEach((b) => (b.disabled = true));
      this.entry = new SecretEntry(
        $("#unlock-entry"),
        "unlock-secret",
        this.parsed.header.kdf.name === "HKDF-SHA256"
          ? "Private key"
          : "Passphrase",
        (value) => {
          this.attempted = value;
          if (!runner.submit()) this.attempted = "";
        },
      );
      $("#unlock-result").innerHTML =
        '<p class="signal">3–2–1… Then enter your secret and press Unlock before the audio finishes.</p>';
      await runner.start(
        this.buffer,
        (submitted) => void this.finish(submitted),
      );
    } catch {
      this.busy = false;
      this.failure();
    }
  }
  private async finish(submitted: boolean): Promise<void> {
    this.entry?.clear();
    try {
      if (!submitted) throw new Error();
      $("#unlock-result").innerHTML = busy(
        "Verifying your secret and decrypting locally…",
      );
      this.secret = await decryptPackage(this.parsed!, this.attempted, (f) =>
        kdfProgress(this.root, f),
      );
      this.attempted = "";
      if (this.parsed!.header.mime === "text/plain")
        await this.reveal(
          new TextDecoder("utf-8", { fatal: true }).decode(this.secret),
        );
      else {
        const bytes = this.secret.slice(),
          mime = this.parsed!.header.mime;
        this.voiceUrl = URL.createObjectURL(
          new Blob([ownedBuffer(bytes)], { type: mime }),
        );
        $("#unlock-result").innerHTML =
          '<div class="unlock-notice">✓ Decryption completed.</div><div class="secret-box"><span class="tiny-label">YOUR ORIGINAL VOICE NOTE</span><h3>A private voice inside a familiar sound.</h3><audio id="voice-secret" controls></audio><p class="smallprint">Play privately. Anyone who can hear it can record or share it.</p><button id="download-voice" class="small">Download original voice note</button></div>';
        $<HTMLAudioElement>("#voice-secret").src = this.voiceUrl;
        $("#download-voice").onclick = () => {
          if (!this.voiceUrl) return;
          const a = document.createElement("a");
          a.href = this.voiceUrl;
          a.download = `private-voice.${mime.startsWith("audio/mpeg") ? "mp3" : mime.startsWith("audio/mp4") ? "m4a" : mime.split("/")[1].split(";")[0]}`;
          a.click();
        };
        bytes.fill(0);
      }
      this.secret.fill(0);
      this.secret = undefined;
      toast("Decryption completed.");
    } catch {
      this.failure();
    } finally {
      this.attempted = "";
      this.secret?.fill(0);
      this.secret = undefined;
      this.busy = false;
      if (this.practice) {
        const b = document.createElement("button");
        b.id = "practice-again";
        b.className = "button retry";
        b.textContent = "Practice again";
        b.onclick = () => {
          this.unmount();
          this.config();
          $("#unlock-entry").innerHTML = "";
          $("#unlock-result").innerHTML = "";
        };
        $("#unlock-result").append(b);
      }
    }
  }
  private failure(): void {
    if (!this.root.querySelector("#unlock-result")) return;
    $("#unlock-result").innerHTML =
      '<div class="failure"><span>◈</span><h3>Nothing unlocked.</h3></div>';
  }
  private async reveal(text: string): Promise<void> {
    $("#unlock-result").innerHTML =
      '<div class="unlock-notice">✓ Decryption completed.</div><div class="secret-box"><div class="row"><span class="tiny-label">PRIVATE MESSAGE</span><button id="copy-secret" class="text-button">Copy message ↗</button></div><p id="secret-text"></p></div>';
    const target = $("#secret-text"),
      reduced =
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.body.classList.contains("calm");
    if (!reduced) {
      for (let i = 0; i < 8; i++) {
        target.textContent =
          text.slice(0, Math.floor((text.length * i) / 8)) + "░▒·";
        await new Promise((r) => setTimeout(r, 25));
      }
    }
    target.textContent = text;
    $("#copy-secret").onclick = () =>
      void navigator.clipboard
        .writeText(target.textContent || "")
        .then(() => toast("Copied to clipboard."))
        .catch(() =>
          toast("Clipboard unavailable. Select the message to copy it."),
        );
  }
}
