import { audio } from "../audio/engine";
import { readVoiceFile } from "../audio/voice-file";
import {
  generateKey,
  generatePassphrase,
  decodeKey,
  passphraseStrength,
  ownedBuffer,
  type CredentialMode,
} from "../core/credentials";
import { demoSong } from "../core/demo";
import { runner } from "../core/runner";
import {
  cryptoSetupIssue,
  rehearsalSetupFailure,
  type RehearsalSetupPhase,
} from "../core/environment";
import { crypt, decryptPackage } from "../crypto";
import {
  ARGON2,
  embed,
  headerBytes,
  parseFile,
  fileHash,
  MAX_AUDIO,
  MAX_PAYLOAD,
  type Header,
} from "../crypto/format";
import {
  $,
  escape,
  toast,
  busy,
  kdfProgress,
  bindUpload,
  uploadZone,
  audioFile,
  download,
  icons,
} from "./dom";
import { SecretEntry } from "./entry";
import type { Studio } from "./types";
const steps = ["Choose audio", "Add secret", "Protect", "Rehearse", "Download"];
export class HideFlow {
  step = 0;
  file?: File;
  original?: Uint8Array;
  buffer?: AudioBuffer;
  text = "";
  voice?: Uint8Array;
  voiceMime = "audio/webm";
  voiceName = "";
  voiceDuration = 0;
  payloadKind: "text" | "voice" = "text";
  credentialMode: CredentialMode = "key";
  key = generateKey();
  passphrase = "";
  passed = false;
  downloaded = false;
  locked = false;
  recorder?: MediaRecorder;
  private stream?: MediaStream;
  private timer?: ReturnType<typeof setTimeout>;
  private voiceUrl?: string;
  private entry?: SecretEntry;
  private attempted = "";
  private header?: Header;
  private cipher?: Uint8Array;
  private encoded?: Uint8Array;
  get busy(): boolean {
    return this.locked || this.recorder?.state === "recording";
  }
  private get credential(): string {
    return this.credentialMode === "key" ? this.key : this.passphrase;
  }
  constructor(
    private root: HTMLElement,
    private studio: Studio,
  ) {}
  mount(): void {
    this.render();
    if (this.buffer) this.studio.load(this.buffer, this.file!.name);
  }
  unmount(): void {
    this.persist();
    this.stopMic();
    this.revokeVoice();
    this.entry?.clear();
    this.entry = undefined;
  }
  update(): void {
    this.entry?.update();
    if (this.step === 3 && runner.running) {
      const status = this.root.querySelector<HTMLElement>("#rehearsal-status");
      const ms = runner.clock.now();
      const text =
        ms < 0
          ? `Rehearsal starts in ${Math.ceil(-ms / 1000)}… The secret field opens when audio starts.`
          : "Audio is playing. Type or paste your secret above, then press Unlock or Enter before the track ends.";
      if (status && status.textContent !== text) status.textContent = text;
    }
  }
  appendSecret(char: string): void {
    this.entry?.append(char);
  }
  private revokeVoice(): void {
    if (this.voiceUrl) URL.revokeObjectURL(this.voiceUrl);
    this.voiceUrl = undefined;
  }
  private invalidate(): void {
    this.passed = false;
    this.header = undefined;
    this.cipher = undefined;
    this.encoded = undefined;
  }
  private persist(): void {
    if (this.step === 1) {
      const el = this.root.querySelector<HTMLTextAreaElement>("#message");
      if (el) this.text = el.value;
    }
    if (this.step === 2) {
      const el =
        this.root.querySelector<HTMLInputElement>("#sender-passphrase");
      if (el) this.passphrase = el.value;
    }
  }
  render(): void {
    this.entry = undefined;
    this.root.innerHTML = `<div class="page-heading"><div><p class="eyebrow">A PRIVATE VOICE INSIDE A FAMILIAR SOUND</p><h1 class="page-title">Your sound. <span>Their secret.</span></h1></div><span class="local-badge">${icons.lock} Never leaves your device</span></div><ol class="stepper">${steps.map((s, i) => `<li class="${i === this.step ? "current" : i < this.step ? "done" : ""}"><span>${i < this.step ? "✓" : i + 1}</span>${s}</li>`).join("")}</ol><section class="flow-card card"><div class="flow-main" id="hide-content"></div><aside class="flow-aside"><span class="tiny-label">PRIVATE BY DESIGN</span><div class="aside-symbol">${icons.lock}</div><h3>A sound for everyone.<br>A voice for someone.</h3><p>Use a piano tune, song, speech, or ambient recording. Your secret voice stays separate, encrypted inside the downloaded file.</p><div class="aside-note">${icons.lock}<span>AES-256-GCM + carrier verification<br><small>Generated 256-bit keys or Argon2id passphrases</small></span></div><p class="smallprint">The one-try rule is browser-only and bypassable. No encryption can rescue a guessable password.</p></aside></section><div class="flow-footer"><button id="hide-back" ${this.step === 0 || this.downloaded ? "disabled" : ""}>← Back</button><span>STEP ${this.step + 1} OF 5</span><button class="primary" id="hide-next">${this.step === 4 ? "Start another" : `Continue ${icons.arrow}`}</button></div>`;
    $("#hide-back").onclick = () => {
      if (this.downloaded) return;
      if (this.busy || runner.running)
        return toast("Finish the active session or recording first.");
      this.persist();
      this.step--;
      this.render();
    };
    $("#hide-next").onclick = () => void this.next();
    this.content();
  }
  private content(): void {
    const el = $("#hide-content");
    if (this.step === 0) {
      el.innerHTML = `<p class="tiny-label">01 / THE CARRIER</p><h2>Not just songs. Any supported sound.</h2><p>A piano tune, a voice, a field recording. Choose an original file you have permission to share.</p>${uploadZone("song", ".mp3,.wav,.ogg,.m4a", "Drop your carrier audio here", "MP3, WAV, OGG or M4A · up to 50 MB")}<div id="song-result">${this.file ? `<div class="file-chip"><span>♫ ${escape(this.file.name)}</span><span>${this.buffer!.duration.toFixed(1)}s · ready ✓</span></div>` : ""}</div><button id="use-demo" class="text-button">Use our original piano-like demo ${icons.arrow}</button><p class="smallprint">MP4 video is not supported. Renaming an extension does not convert a file.</p>`;
      bindUpload("song", (f) => void this.upload(f));
      $("#use-demo").onclick = () =>
        void demoSong()
          .then((f) => this.upload(f))
          .catch(() => toast("Local demo unavailable."));
    }
    if (this.step === 1) this.messageContent(el);
    if (this.step === 2) this.protectionContent(el);
    if (this.step === 3) {
      el.innerHTML = `<p class="tiny-label">04 / YOUR SOUND CHECK</p><h2>Try exactly what your friend will do.</h2><p>Copy your secret, start playback, then paste or type it and press Unlock. You do not need to wait for the song to finish. Only one submission is allowed per rehearsal.</p><div class="cue-actions"><button id="copy-rehearsal">Copy my ${this.credentialMode === "key" ? "key" : "passphrase"}</button><button id="rehearse" class="primary">${icons.play} Start full rehearsal</button></div><div id="rehearsal-entry"></div><div id="rehearsal-status" role="status" aria-live="polite">${this.passed ? '<p class="success">Rehearsal passed. Continue to download.</p>' : ""}</div>`;
      this.createRehearsalEntry();
      const issue = cryptoSetupIssue();
      if (issue) {
        $("#rehearsal-status").textContent = `Rehearsal cannot start. ${issue}`;
        $<HTMLButtonElement>("#rehearse").disabled = true;
      }
      $("#copy-rehearsal").onclick = () => void this.copySecret();
      $("#rehearse").onclick = () => void this.rehearse();
    }
    if (this.step === 4) {
      el.innerHTML = `<p class="tiny-label">05 / SEALED WITH A SOUND</p><h2>Your private message is ready.</h2><div class="download-art"><div class="disc"></div><span>${icons.lock}</span></div><p>The original carrier bytes are unchanged and cryptographically bound to the encrypted message.</p><button id="download" class="primary">↓ Download encrypted audio</button><p class="share-note">Share the key or passphrase through a different trusted channel.</p><p class="smallprint">Send the audio as a Document/file—not as a compressed voice message. Conversion can destroy the payload. Keep your copied secret safe; it is discarded here after downloading.</p>`;
      $("#download").onclick = () => {
        if (!this.encoded || !this.passed) return;
        download(
          this.encoded,
          this.file!.name.replace(/\.[^.]+$/, ".xhang") +
            this.file!.name.slice(this.file!.name.lastIndexOf(".")),
          this.file!.type || "application/octet-stream",
        );
        this.downloaded = true;
        $<HTMLButtonElement>("#hide-back").disabled = true;
        this.key = "";
        this.passphrase = "";
        this.text = "";
        this.voice?.fill(0);
        this.voice = undefined;
        this.revokeVoice();
      };
    }
  }
  private messageContent(el: HTMLElement): void {
    this.revokeVoice();
    el.innerHTML = `<p class="tiny-label">02 / THE HIDDEN MESSAGE</p><h2>A note. Or your actual voice.</h2><div class="segmented"><button id="kind-text" aria-pressed="${this.payloadKind === "text"}">Text</button><button id="kind-voice" aria-pressed="${this.payloadKind === "voice"}">Voice note</button></div>${this.payloadKind === "text" ? `<label class="field">Secret message<textarea id="message" rows="5" maxlength="10000" placeholder="We need to meet at school at 9 AM…">${escape(this.text)}</textarea></label><p class="smallprint">Up to 10,000 characters. Never stored in browser storage.</p>` : `<div class="voice-box"><h3>${this.voice ? "Voice note ready" : "Your voice. Not an AI recreation."}</h3><p>Record here or upload an original voice note. Up to 60 seconds / 10 MB. Uploaded bytes are encrypted without transcoding.</p><button id="record-voice">${this.recorder?.state === "recording" ? "■ Stop recording" : "◉ Record my voice"}</button><span id="voice-status" role="status">${this.recorder?.state === "recording" ? " Recording… microphone active." : ""}</span></div>${uploadZone("voice-file", ".mp3,.wav,.ogg,.webm,.m4a", "Upload a secret voice note", "MP3, WAV, OGG, WebM, M4A · 60 seconds / 10 MB")}<div id="voice-result">${this.voice ? `<div class="file-chip"><span>${escape(this.voiceName || "Recorded voice note")}</span><span>${this.voiceDuration ? this.voiceDuration.toFixed(1) + "s" : "ready"}</span></div><audio id="voice-preview" controls></audio>` : ""}</div>`}`;
    $("#kind-text").onclick = () => {
      if (this.busy) return toast("Stop recording first.");
      this.persist();
      this.payloadKind = "text";
      this.invalidate();
      this.messageContent(el);
    };
    $("#kind-voice").onclick = () => {
      if (this.busy) return toast("Finish the active action first.");
      this.persist();
      this.payloadKind = "voice";
      this.invalidate();
      this.messageContent(el);
    };
    if (this.payloadKind === "voice") {
      $("#record-voice").onclick = () => void this.recordVoice();
      bindUpload("voice-file", (f) => void this.uploadVoice(f));
      if (this.voice) {
        this.voiceUrl = URL.createObjectURL(
          new Blob([ownedBuffer(this.voice)], { type: this.voiceMime }),
        );
        $<HTMLAudioElement>("#voice-preview").src = this.voiceUrl;
      }
    }
  }
  private protectionContent(el: HTMLElement): void {
    el.innerHTML = `<p class="tiny-label">03 / THE KEY IS THE SECURITY</p><h2>Generated is stronger than memorable.</h2><div class="segmented"><button id="mode-key" aria-pressed="${this.credentialMode === "key"}">Generated key · recommended</button><button id="mode-passphrase" aria-pressed="${this.credentialMode === "passphrase"}">Long passphrase</button></div>${this.credentialMode === "key" ? `<label class="field">Your private key<input id="sender-key" class="key-display" readonly value="${escape(this.key)}" aria-label="Generated private key" title="256 random bits. Copy exactly; never share it alongside the audio."></label><div class="cue-actions"><button id="copy-secret">Copy key</button><button id="regenerate">Generate a fresh key</button></div><p class="smallprint">32 random bytes from the browser CSPRNG. HKDF derives a file-specific AES-256 key. This is not a password you invent.</p>` : `<label class="field">Long passphrase<input id="sender-passphrase" type="password" maxlength="1024" autocomplete="new-password" value="${escape(this.passphrase)}" placeholder="Use independent random words, not a name" title="24–1024 characters. Case and spaces matter; Unicode is normalized to NFC."></label><div class="cue-actions"><button id="generate-passphrase">Generate random grouped letters</button><button id="copy-secret">Copy passphrase</button><button id="show-passphrase" aria-pressed="false">Show</button></div><p id="strength-description" class="smallprint">${escape(passphraseStrength(this.passphrase).text)}</p><p class="smallprint">Argon2id: 64 MiB, 3 passes, one lane. Pure JavaScript in a worker—no WASM, CDN, or weaker fallback. This can take several seconds on phones.</p>`}<label class="check credential-check"><input id="saved-secret" type="checkbox"> I have copied this secret somewhere safe and will share it separately.</label>`;
    $("#mode-key").onclick = () => {
      this.persist();
      if (this.credentialMode === "key") return;
      this.credentialMode = "key";
      if (!this.key) this.key = generateKey();
      this.invalidate();
      this.protectionContent(el);
    };
    $("#mode-passphrase").onclick = () => {
      this.persist();
      if (this.credentialMode === "passphrase") return;
      this.credentialMode = "passphrase";
      this.invalidate();
      this.protectionContent(el);
    };
    $("#copy-secret").onclick = () => {
      this.persist();
      void this.copySecret();
    };
    if (this.credentialMode === "key")
      $("#regenerate").onclick = () => {
        this.key = generateKey();
        this.invalidate();
        this.protectionContent(el);
      };
    else {
      const input = $<HTMLInputElement>("#sender-passphrase");
      input.oninput = () => {
        this.passphrase = input.value;
        this.invalidate();
        $("#strength-description").textContent = passphraseStrength(
          this.passphrase,
        ).text;
        $<HTMLInputElement>("#saved-secret").checked = false;
      };
      $("#generate-passphrase").onclick = () => {
        this.passphrase = generatePassphrase();
        this.invalidate();
        this.protectionContent(el);
      };
      $("#show-passphrase").onclick = () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        $("#show-passphrase").setAttribute("aria-pressed", String(show));
        $("#show-passphrase").textContent = show ? "Hide" : "Show";
      };
    }
  }
  private async copySecret(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.credential);
      toast("Copied. Keep this secret separate from the audio.");
    } catch {
      toast("Clipboard unavailable. Copy from the Protect step manually.");
    }
  }
  private async upload(file: File): Promise<void> {
    if (this.busy) return;
    if (!audioFile(file))
      return toast("Choose MP3, WAV, OGG or M4A. MP4 video is not supported.");
    if (!file.size || file.size > MAX_AUDIO)
      return toast("Choose a nonempty audio file up to 50 MB.");
    this.locked = true;
    $("#song-result").innerHTML =
      '<div class="skeleton">Decoding locally…</div>';
    try {
      await audio.ready();
      const original = new Uint8Array(await file.arrayBuffer()),
        buffer = await audio.context.decodeAudioData(original.slice().buffer);
      if (
        !Number.isFinite(buffer.duration) ||
        buffer.duration < 6 ||
        buffer.duration > 86400
      )
        throw new Error();
      this.file = file;
      this.original = original;
      this.buffer = buffer;
      this.invalidate();
      this.studio.load(buffer, file.name);
      this.content();
    } catch {
      toast("Could not decode this audio. Try a WAV of at least six seconds.");
      $("#song-result").textContent = "Unable to decode this file.";
    } finally {
      this.locked = false;
    }
  }
  private async uploadVoice(file: File): Promise<void> {
    if (this.busy) return;
    this.locked = true;
    try {
      await audio.ready();
      const result = await readVoiceFile(file, audio.context);
      this.voice?.fill(0);
      this.voice = result.bytes;
      this.voiceMime = result.mime;
      this.voiceDuration = result.duration;
      this.voiceName = file.name;
      this.invalidate();
      this.messageContent($("#hide-content"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not read this voice note.");
    } finally {
      this.locked = false;
    }
  }
  private async next(): Promise<void> {
    if (this.busy || runner.running)
      return toast("Finish the recording or session first.");
    this.persist();
    if (this.step === 0 && !this.buffer)
      return toast("Choose carrier audio first.");
    if (this.step === 1) {
      if (this.payloadKind === "text" && !this.text.trim())
        return toast("Write a message first.");
      if (this.payloadKind === "voice" && !this.voice?.length)
        return toast("Record or upload a voice note first.");
      this.invalidate();
    }
    if (this.step === 2) {
      if (
        this.credentialMode === "passphrase" &&
        !passphraseStrength(this.passphrase).ok
      )
        return toast(passphraseStrength(this.passphrase).text);
      if (!$<HTMLInputElement>("#saved-secret").checked)
        return toast("Copy your secret and confirm you have saved it first.");
      if (this.credentialMode === "key") {
        const bytes = decodeKey(this.key);
        bytes.fill(0);
      }
      this.invalidate();
    }
    if (this.step === 3 && !this.passed)
      return toast("Pass a rehearsal before downloading.");
    if (this.step === 4) {
      this.reset();
      return;
    }
    this.step++;
    this.render();
  }
  private async seal(): Promise<void> {
    this.header = {
      version: 3,
      salt: Array.from(crypto.getRandomValues(new Uint8Array(16))),
      iv: Array.from(crypto.getRandomValues(new Uint8Array(12))),
      mime: this.payloadKind === "text" ? "text/plain" : this.voiceMime,
      carrierHash: await fileHash(this.original!),
      kdf:
        this.credentialMode === "key" ? { name: "HKDF-SHA256" } : { ...ARGON2 },
    };
    const payload =
      this.payloadKind === "text"
        ? new TextEncoder().encode(this.text)
        : this.voice!;
    this.cipher = await crypt(
      "encrypt",
      this.header,
      this.credential,
      payload,
      headerBytes(this.header),
      (f) => kdfProgress(this.root, f),
    );
    this.encoded = embed(this.original!, headerBytes(this.header), this.cipher);
  }
  private createRehearsalEntry(): void {
    this.entry = new SecretEntry(
      $("#rehearsal-entry"),
      "rehearsal-secret",
      "Rehearsal key or passphrase",
      (value) => {
        this.attempted = value;
        if (!runner.submit()) this.attempted = "";
      },
    );
  }
  private async rehearse(): Promise<void> {
    if (this.busy || runner.running) return;
    const issue = cryptoSetupIssue();
    if (issue) {
      $("#rehearsal-status").textContent = `Rehearsal cannot start. ${issue}`;
      return;
    }
    this.locked = true;
    this.passed = false;
    this.attempted = "";
    this.createRehearsalEntry();
    let phase: RehearsalSetupPhase = "audio";
    $("#rehearsal-status").innerHTML = busy(
      "Preparing audio and sealing your rehearsal locally…",
    );
    try {
      // Resume synchronously from the click, before encryption awaits.
      // Autoplay permission must not depend on user activation surviving the KDF.
      await audio.ready();
      phase = "encryption";
      await this.seal();
      phase = "playback";
      $("#rehearsal-status").textContent =
        "Get ready. 3–2–1… Then enter your secret above and press Unlock before playback ends.";
      await runner.start(
        this.buffer!,
        (submitted) => void this.finishRehearsal(submitted),
      );
    } catch (error) {
      this.locked = false;
      this.entry?.clear();
      // Only setup capabilities/stage are exposed, never secrets or crypto jobs.
      console.error("[xhang] rehearsal setup failed", {
        phase,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      $("#rehearsal-status").textContent = rehearsalSetupFailure(phase);
    }
  }
  private async finishRehearsal(submitted: boolean): Promise<void> {
    this.entry?.clear();
    try {
      if (!submitted) throw new Error();
      $("#rehearsal-status").innerHTML = busy(
        "Verifying the complete secret and carrier…",
      );
      const result = await decryptPackage(
        parseFile(this.encoded!),
        this.attempted,
        (f) => kdfProgress(this.root, f),
      );
      result.fill(0);
      this.passed = true;
      $("#rehearsal-status").innerHTML =
        '<p class="success">Rehearsal passed. Your encrypted file is ready. ✓</p>';
    } catch {
      this.passed = false;
      $("#rehearsal-status").textContent = "Nothing unlocked.";
    } finally {
      this.attempted = "";
      this.locked = false;
    }
  }
  private async recordVoice(): Promise<void> {
    if (this.recorder?.state === "recording") {
      this.stopMic();
      return;
    }
    if (this.locked) return;
    this.locked = true;
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = type
        ? new MediaRecorder(this.stream, { mimeType: type })
        : new MediaRecorder(this.stream);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      let size = 0;
      const mime = recorder.mimeType,
        start = performance.now();
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
        size += e.data.size;
        if (size > MAX_PAYLOAD) this.stopMic();
      };
      recorder.onstop = () => {
        this.locked = true;
        this.stream?.getTracks().forEach((t) => t.stop());
        void (async () => {
          try {
            const bytes = new Uint8Array(
              await new Blob(chunks, { type: mime }).arrayBuffer(),
            );
            if (!bytes.length || bytes.length > MAX_PAYLOAD) throw new Error();
            this.voice?.fill(0);
            this.voice = bytes;
            this.voiceMime = mime;
            this.voiceName = "My recorded voice note";
            this.voiceDuration = Math.min(
              60,
              (performance.now() - start) / 1000,
            );
            this.invalidate();
            if (this.step === 1 && this.root.querySelector("#hide-content"))
              this.messageContent($("#hide-content"));
          } catch {
            toast(
              "Could not save the recording. Try a shorter note or upload a voice file.",
            );
          } finally {
            this.locked = false;
          }
        })();
      };
      recorder.start(500);
      this.timer = setTimeout(() => this.stopMic(), 60000);
      this.locked = false;
      this.messageContent($("#hide-content"));
    } catch {
      this.stream?.getTracks().forEach((t) => t.stop());
      this.locked = false;
      toast(
        "Microphone unavailable or permission denied. Upload a voice note or use text instead.",
      );
    }
  }
  private stopMic(): void {
    if (this.timer) clearTimeout(this.timer);
    if (this.recorder?.state === "recording") {
      this.locked = true; // Keep navigation blocked until the final blob is saved.
      this.recorder.stop();
    }
    this.stream?.getTracks().forEach((t) => t.stop());
  }
  private reset(): void {
    this.voice?.fill(0);
    this.voice = undefined;
    this.revokeVoice();
    this.text = "";
    this.passphrase = "";
    this.attempted = "";
    this.key = generateKey();
    this.credentialMode = "key";
    this.payloadKind = "text";
    this.downloaded = false;
    this.step = 0;
    this.invalidate();
    this.render();
  }
}
