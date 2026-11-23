import "./style.css";
import { audio } from "./audio/engine";
import { CODES, visualHit, type Letter } from "./core/keys";
import { runner } from "./core/runner";
import { demoSong } from "./core/demo";
import { Spectrum } from "./ui/spectrum";
import { Timeline } from "./ui/timeline";
import { Background } from "./ui/background";
import { HideFlow } from "./ui/hide";
import { UnlockFlow } from "./ui/unlock";
import { $, icons, toast, timeLabel } from "./ui/dom";
import type { Studio } from "./ui/types";
const eq =
  '<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
$("#app").innerHTML =
  `<header class="topbar"><a class="brand" href="#play" aria-label="xhang home">${eq}xhang<span class="brand-dot">.</span></a><nav aria-label="Main navigation">${["Play", "Hide", "Unlock", "Learn"].map((t) => `<a href="#${t.toLowerCase()}" data-tab="${t.toLowerCase()}">${t}</a>`).join("")}</nav><div class="header-tools"><button id="calm" class="calm-toggle" aria-pressed="false" title="Disable the animated background and decorative movement"><span>◔</span> Calm mode</button><button id="help" class="help-button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts">?</button></div></header><main><div id="page"></div><section class="studio card" id="studio" aria-label="Music playground"><div class="studio-head"><div class="studio-label"><span class="live-dot"></span><span id="studio-mode">THE PLAYGROUND</span><span class="pill">LIVE AUDIO</span></div><div class="studio-tools"><label title="All five instruments are locally synthesized. No sample downloads."><span class="sr-only">Instrument</span><select id="instrument"><option value="piano">Piano · synth</option><option value="electric">Electric piano</option><option value="organ">Organ</option><option value="marimba">Marimba</option><option value="pad">Ambient pad</option></select></label><button id="mute" class="icon-button" aria-pressed="false" title="Mute only your piano notes, not the song" aria-label="Mute piano notes">♫</button></div></div><div class="track-info"><div class="album-art">${eq}</div><div><h2 id="track-title">After hours</h2><p id="track-subtitle">xhang originals · a little room to play</p></div><div class="track-time"><span id="track-time">0:00</span><span id="duration"> / 0:25</span></div></div><div class="graph-wrap"><canvas id="spectrum" aria-label="Live audio frequency spectrum"></canvas><span class="graph-tag">FREQUENCY / Hz</span><div id="countdown" aria-live="polite"></div></div><div class="timeline-wrap"><canvas id="timeline" title="Song waveform and playback position. Secret input is untimed." aria-label="Song waveform and playback position"></canvas></div><div class="transport-row"><div><button id="transport" class="transport" title="Play or stop the playground demo. Disabled during one-shot sessions." aria-label="Play demo song">${icons.play}</button><span id="transport-caption">Play the demo, or make your own melody.</span></div><label class="zoom-label" title="Zoom the waveform. During playback it follows the playhead."><span>−</span><span class="sr-only">Waveform zoom</span><input type="range" id="zoom" min="1" max="4" step=".25" value="1"><span>+</span></label></div><div class="keyboard-top"><span>YOUR KEYBOARD. YOUR INSTRUMENT.</span><span><button id="octave" class="octave-toggle" aria-pressed="false" title="Latch Shift / octave up for touch piano keys. Physical letter keys use the actual Shift key.">SHIFT ↑</button> octave up <span class="legend-dot"></span> C3 → C♯5</span></div><div id="piano" class="piano" aria-label="Touch piano">${CODES.map((c, i) => `<button class="piano-key ${[1, 3, 6, 8, 10].includes(i % 12) ? "accidental" : ""}" data-code="${c}" aria-label="Play ${c.slice(3)}${[1, 3, 6, 8, 10].includes(i % 12) ? " sharp note" : ""}" title="${c.slice(3)} · MIDI ${48 + i}"><span>${c.slice(3)}</span></button>`).join("")}</div><div class="keyboard-bottom"><span><span class="green-dot"></span> All sound. No wrong notes.</span><span>Press A–Z or tap the keys <span class="kbd-mini">⌨</span></span></div></section><div id="below"></div><footer><a class="footer-brand" href="#play">xhang.</a><span>Made for the things you can't just say.</span><span class="footer-local"><span class="green-dot"></span> Local. Private. Yours.</span></footer></main><dialog id="shortcuts"><div class="row"><h2>A few keys to the music.</h2><button id="close-help" aria-label="Close keyboard shortcuts">×</button></div><dl><dt><kbd>A</kbd>–<kbd>Z</kbd></dt><dd>26 consecutive semitones, starting at C3.</dd><dt><kbd>Shift</kbd> + letter</dt><dd>Play one octave higher. Piano Shift affects pitch only—not password case.</dd><dt><kbd>?</kbd></dt><dd>Open this guide outside text fields.</dd><dt><kbd>Tab</kbd> / <kbd>Enter</kbd></dt><dd>Navigate / activate controls. Focused piano keys also play with Enter or Space.</dd></dl><p>During an unlock: no pause, seek, speed change, or replay. Type or paste your key/passphrase in the entry field, then press Enter or Unlock during playback. Only submission attempts decryption. Leaving the tab ends the attempt.</p><button id="close-help-bottom" class="primary">Got it</button></dialog>`;
const background = new Background($<HTMLCanvasElement>("#ambience"));
const spectrum = new Spectrum($<HTMLCanvasElement>("#spectrum"));
const timeline = new Timeline($<HTMLCanvasElement>("#timeline"));
let selected: AudioBuffer | undefined;
let freePlaying = false;
let route = "";
let touchOctave = false;
const studio: Studio = {
  load(buffer, name) {
    audio.stop();
    freePlaying = false;
    selected = buffer;
    timeline.load(buffer);
    $("#track-title").textContent = name.replace(/\.[^.]+$/, "");
    $("#track-subtitle").textContent = "On your device · no upload, ever";
    $("#duration").textContent = ` / ${timeLabel(buffer.duration)}`;
  },
};
const hide = new HideFlow($("#page"), studio);
const unlock = new UnlockFlow($("#page"), studio);
function playPage(): void {
  $("#page").innerHTML =
    `<section class="hero"><div class="hero-copy"><div class="hero-kicker"><span class="tiny-eq">▥</span> A NEW WAY TO SAY IT</div><h1>Hide secrets<br>inside <span class="gradient-text">sound.</span></h1><p>A sound for everyone.<br>A private voice for someone.</p><div class="hero-actions"><a href="#hide" class="button primary">${icons.lock} Hide a message ${icons.arrow}</a><a href="#unlock" class="button secondary">Unlock a song ${icons.arrow}</a></div><div class="hero-assurances"><span>◈ End-to-end encrypted</span><span>○ No accounts</span><span>↗ Never uploaded</span></div></div><div class="hero-visual" aria-hidden="true"><div class="orbit orbit-outer"></div><div class="orbit orbit-middle"></div><div class="orbit orbit-inner"></div><div class="secret-core">${icons.lock}</div><div class="orbit-label label-one"><i></i> a little mystery</div><div class="orbit-label label-two">♫ &nbsp; a familiar song</div><div class="visual-caption">THE MESSAGE IS IN THE MOMENT.</div><span class="star star-one">+</span><span class="star star-two">+</span><span class="orbital-point"></span></div></section><div class="section-intro"><div><span class="section-number">01 —</span><h2>Find your frequency.</h2></div><p>Go on. Play a little. See what happens.</p></div>`;
  $("#below").innerHTML =
    `<div class="feature-grid"><article><span class="feature-number">01 / HIDE</span><h3>Give your song a secret.</h3><p>Choose a sound, add text or your own voice, and protect it with a generated key or long passphrase.</p><a href="#hide">Make a secret ${icons.arrow}</a></article><article><span class="feature-number">02 / SHARE</span><h3>Send the song. Keep the key.</h3><p>Send the audio as a file. Share its key through another trusted channel.</p><a href="#learn">How it stays private ${icons.arrow}</a></article><article><span class="feature-number">03 / UNLOCK</span><h3>Your letters. Your own pace.</h3><p>Enter the secret, then press Unlock during playback. One submission. No timing targets.</p><a href="#unlock">Try the practice demo ${icons.arrow}</a></article></div><div class="bottom-note">Not everything needs to be said out loud. <span>Some things can be played.</span></div>`;
}
function learnPage(): void {
  $("#page").innerHTML =
    `<div class="learn-intro"><p class="eyebrow">LESS MAGIC. MORE HONESTY.</p><h1 class="page-title">A secret, <span>not a security promise.</span></h1><p>Music is the ritual. Encryption is the protection. Here's where each one ends.</p></div><div class="learn-grid">${[
      [
        "01",
        "One explicit submission.",
        "Enter a complete key or passphrase at any pace during playback, then press Unlock or Enter. Submission stops playback and starts one decrypt attempt immediately. No automatic per-keystroke guesses, secret-length hints, cue times or correctness feedback.",
      ],
      [
        "02",
        "Random is stronger than memorable.",
        "Default: 32 cryptographically random bytes, with HKDF-SHA256 deriving a file-specific AES-256-GCM key. Passphrases use Argon2id (64 MiB, 3 passes, one lane), entirely in a bounded JavaScript worker. Use independent random words or generated secrets, not names. A length guardrail cannot prove entropy.",
      ],
      [
        "03",
        "One try is a browser rule.",
        "Only a full-file SHA-256 hash and used flag are stored in localStorage. Clearing storage, switching browsers or modifying code bypasses the attempt rule and playback deadline. Downloaded encrypted files permit offline guessing. No backend can retroactively restrict a key someone already possesses.",
      ],
      [
        "04",
        "Hashes complement encryption.",
        "AES-256-GCM authenticates the exact header and encrypted payload. The header contains a SHA-256 hash of the original carrier bytes, binding that audio to the message. A checksum does not strengthen a weak password, and appending ciphertext is not encoding it into piano pitches. The encrypted block is discoverable.",
      ],
      [
        "05",
        "Share as a file. Always.",
        "Re-encoding can destroy the payload: avoid WhatsApp audio messages, MP3 conversion, trimming, or audio normalization. Send a file attachment, a Drive link (download the original, do not use the preview), Telegram “as file”, or email attachment. Download and unlock locally.",
      ],
      [
        "06",
        "Everything happens here.",
        "No accounts, analytics, backend, remote fonts, or runtime third-party requests. The demo and worker are loaded from this site at startup. Messages and keys are never written to localStorage. Mutable key and payload buffers are cleared after use; JavaScript strings, garbage collection, and non-extractable Web Crypto key lifetime cannot be reliably zeroized.",
      ],
    ]
      .map(
        ([n, title, text]) =>
          `<article class="card"><span class="feature-number">${n}</span><h2>${title}</h2><p>${text}</p></article>`,
      )
      .join(
        "",
      )}</div><div class="learn-callout">${icons.lock}<p><strong>A note on voice notes</strong><br>Recording asks for your microphone. Audio is encrypted locally, never uploaded. Browser audio codec support varies; WAV is the most portable soundtrack.</p></div>`;
}
function renderRoute(): void {
  const next = location.hash.slice(1) || "play";
  const valid = ["play", "hide", "unlock", "learn"].includes(next)
    ? next
    : "play";
  if (
    route &&
    route !== valid &&
    (runner.running || hide.busy || unlock.busy)
  ) {
    toast("Finish this session before changing tabs.");
    history.replaceState(null, "", `#${route}`);
    return;
  }
  if (route === "hide") hide.unmount();
  if (route === "unlock") unlock.unmount();
  audio.stop();
  freePlaying = false;
  route = valid;
  document.querySelectorAll("[data-tab]").forEach((el) => {
    const active = (el as HTMLElement).dataset.tab === route;
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  $("#below").innerHTML = "";
  $("#studio").hidden = route === "learn";
  if (route === "play") {
    playPage();
  }
  if (route === "hide") hide.mount();
  if (route === "learn") learnPage();
  if (route === "unlock") unlock.mount();
}
window.addEventListener("hashchange", renderRoute);
renderRoute();
function press(key: Letter, secretChar?: string): void {
  void audio.ready().then(() => audio.note(key));
  spectrum.burst(visualHit(key.code, true));
  const el = document.querySelector<HTMLButtonElement>(
    `[data-code="${key.code}"]`,
  );
  if (el) {
    el.classList.add("lit");
    el.style.setProperty("--key-color", visualHit(key.code, true).color);
    setTimeout(() => el.classList.remove("lit"), 180);
  }
  if (secretChar && runner.running) {
    if (route === "hide") hide.appendSecret(secretChar);
    if (route === "unlock") unlock.appendSecret(secretChar);
  }
}
window.addEventListener("keydown", (e) => {
  const target = e.target;
  if (e.repeat) {
    if (
      runner.running &&
      target instanceof HTMLElement &&
      target.matches("[data-attempt]")
    )
      e.preventDefault();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (
    target instanceof HTMLElement &&
    target.matches('input,textarea,select,[contenteditable="true"]')
  ) {
    if (runner.running && CODES.includes(e.code))
      press({ code: e.code, shift: e.shiftKey });
    return; // Native entry handles case, spaces, punctuation, editing, paste and Enter.
  }
  if (e.key === "?" && !runner.running) {
    e.preventDefault();
    $<HTMLDialogElement>("#shortcuts").showModal();
    return;
  }
  if ($<HTMLDialogElement>("#shortcuts").open || !CODES.includes(e.code))
    return;
  e.preventDefault();
  press(
    { code: e.code, shift: e.shiftKey },
    e.key.length === 1 ? e.key : undefined,
  );
});
document.querySelectorAll<HTMLButtonElement>("[data-code]").forEach((b) => {
  b.onpointerdown = (e) => {
    e.preventDefault();
    press(
      { code: b.dataset.code!, shift: e.shiftKey || touchOctave },
      b.dataset.code!.slice(3).toLowerCase(),
    );
  };
  b.onkeydown = (e) => {
    if ((e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      press(
        { code: b.dataset.code!, shift: e.shiftKey || touchOctave },
        b.dataset.code!.slice(3).toLowerCase(),
      );
    }
  };
});
$<HTMLSelectElement>("#instrument").onchange = (e) => {
  audio.instrument = (e.target as HTMLSelectElement)
    .value as typeof audio.instrument;
};
$("#octave").onclick = () => {
  touchOctave = !touchOctave;
  $("#octave").setAttribute("aria-pressed", String(touchOctave));
};
$("#mute").onclick = () => {
  audio.muted = !audio.muted;
  $("#mute").setAttribute("aria-pressed", String(audio.muted));
};
$<HTMLInputElement>("#zoom").oninput = (e) => {
  timeline.zoom = Number((e.target as HTMLInputElement).value);
};
$("#transport").onclick = () =>
  void (async () => {
    if (runner.running || hide.busy || unlock.busy)
      return toast("No pause or replay during a session.");
    await audio.ready();
    if (freePlaying) {
      audio.stop();
      freePlaying = false;
      return;
    }
    if (!selected) {
      const f = await demoSong();
      studio.load(
        await audio.context.decodeAudioData(await f.arrayBuffer()),
        "After hours",
      );
    }
    audio.play(selected!);
    freePlaying = true;
  })();
$("#help").onclick = () => {
  if (runner.running) return toast("Finish the one-shot session first.");
  $<HTMLDialogElement>("#shortcuts").showModal();
};
$("#close-help").onclick = $("#close-help-bottom").onclick = () =>
  $<HTMLDialogElement>("#shortcuts").close();
window.addEventListener("blur", () => runner.fail());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) runner.fail();
});
function tick(): void {
  runner.tick();
  const running = runner.running;
  const t = running
    ? Math.max(0, runner.clock.now() / 1000)
    : freePlaying
      ? audio.time()
      : timeline.time;
  if (running || freePlaying)
    timeline.time = Math.min(t, selected?.duration ?? t);
  if (selected && freePlaying && t >= selected.duration) {
    freePlaying = false;
    audio.stop();
  }
  const now = performance.now();
  const energy = spectrum.draw(now);
  background.draw(now, energy.bass, energy.level);
  timeline.draw();
  $("#track-time").textContent = timeLabel(t);
  $("#studio-mode").textContent = running
    ? "ONE-SUBMISSION SESSION"
    : "THE PLAYGROUND";
  if (route === "hide") hide.update();
  if (route === "unlock") unlock.update();
  const countdown =
    running && runner.clock.now() < 0
      ? String(Math.ceil(-runner.clock.now() / 1000))
      : "";
  if ($("#countdown").textContent !== countdown)
    $("#countdown").textContent = countdown;
  $("#transport-caption").textContent = running
    ? "Enter your secret, then press Unlock before playback ends."
    : freePlaying
      ? "Let the sound lead. Add a few notes."
      : "Play the demo, or make your own melody.";
  $<HTMLButtonElement>("#transport").disabled =
    running || hide.busy || unlock.busy || route === "unlock";
  $("#transport").setAttribute(
    "aria-label",
    freePlaying ? "Stop demo song" : "Play demo song",
  );
  $("#transport").classList.toggle("playing", freePlaying || running);
}
let raf = 0;
function frame() {
  tick();
  raf = requestAnimationFrame(frame);
}
raf = requestAnimationFrame(frame);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(raf);
  else raf = requestAnimationFrame(frame);
});
$("#calm").onclick = () => {
  const on = $("#calm").getAttribute("aria-pressed") !== "true";
  $("#calm").setAttribute("aria-pressed", String(on));
  document.body.classList.toggle("calm", on);
};
if (import.meta.env.MODE === "test") {
  runner.fakeMs = -3000;
  Object.assign(window, {
    __xhangTest: {
      time(ms: number) {
        if (runner.running) runner.fakeMs = ms;
        tick();
      },
      state() {
        return {
          session: runner.session?.state,
          step: hide.step,
          duration: selected ? selected.duration * 1000 : 0,
        };
      },
    },
  });
}

void demoSong()
  .then(async (f) => {
    const bytes = await f.arrayBuffer();
    if (!selected) {
      const pcm = new Int16Array(bytes, 44);
      timeline.peaks = Array.from({ length: 1000 }, (_, i) => {
        let peak = 0;
        const start = Math.floor((i * pcm.length) / 1000);
        for (
          let j = start;
          j < Math.floor(((i + 1) * pcm.length) / 1000);
          j += 5
        )
          peak = Math.max(peak, Math.abs(pcm[j]) / 32768);
        return peak;
      });
      timeline.duration = 25;
    }
  })
  .catch(() =>
    toast("The local demo could not be loaded. You can choose your own song."),
  );

if (!window.isSecureContext)
  toast(
    "Open xhang on localhost or HTTPS. Web Crypto and microphone access need a secure context.",
  );
