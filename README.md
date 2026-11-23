# xhang v3.0.1

**A private voice inside a familiar sound.**

**Step 4 fix (3.0.1):** No API key, Python package or backend is required.
Step 4 now checks secure context / Web Crypto before starting, explains setup
errors instead of calling them a failed secret, resumes audio directly from the
button gesture before encryption, and shows its entry field/countdown in Step 4.
Use localhost on the same computer or HTTPS; ordinary HTTP LAN/IP origins cannot
use Web Crypto. The browser restriction is not bypassed. See `STEP4-FIX.md`.

A static, client-side web app. Choose a piano tune, song, speech, or ambient
recording; encrypt text or an original voice note inside its downloaded file;
then unlock during playback using a generated key or long passphrase.

## Install / update

Open the folder containing `package.json` in VS Code. Use **Node 20.19+**
(`.nvmrc` selects Node 20; tested on Node 20.20.2), then:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. **Don't double-click `index.html`**. `file://`
is unsupported: workers, Web Crypto, AudioContext and microphone access need
localhost or HTTPS. Stop with Ctrl+C. `npm install` also works.

**Updating an existing project:** extract the replacement-files ZIP into the
existing project root and overwrite all included files, including `package.json`,
`package-lock.json`, and `public/demo.xhang.wav`. Run `npm ci` again. Restart the
dev server and refresh the browser. Do not mix v2 and v3 source files.

**Compatibility:** v3 deliberately rejects old v1/v2 encrypted packages. Recreate
old secret audio using this release. The bundled encrypted practice file is v3;
the original `public/demo.wav` is unchanged. One new exact runtime dependency,
`@noble/hashes@2.4.0`, implements Argon2id in pure JavaScript. No WASM/CDN is used.
The strict production CSP is unchanged, including no `unsafe-eval` permissions.

### Google Drive hygiene

Do **not** sync `node_modules`, `dist`, browser caches, `test-results`, or
`playwright-report` to Drive. Configure actual sync exclusions or develop from a
non-synced local copy. VS Code exclusions and `.gitignore` only affect the editor
and Git; they do not configure Google Drive. No Drive integration, uploads,
backend, analytics, account, or server-side storage exists in the application.

## Use it

### Sender — Hide

1. **Choose audio:** upload/drop an original MP3, WAV, OGG or M4A carrier
   (up to 50 MiB; at least six seconds), or use the bundled demo. It need not be
   music: a piano tune, spoken recording or environmental sound works too.
   Browser codec support varies; WAV is most portable. MP4 video is not supported.
2. **Add secret:** choose text (up to 10,000 characters) or **Voice note**.
   Record with MediaRecorder, or upload an MP3/WAV/OGG/WebM/M4A voice file
   (up to 60 seconds / 10 MiB). Uploaded voice bytes are preserved exactly,
   without transcoding. Recordings use the browser's supported codec. Microphone
   permission is requested only when recording; denial leaves file upload/text
   available. Preview the voice locally before continuing.
3. **Protect:** choose one of the modes below. Copy the secret somewhere safe,
   then confirm that it is saved. It is never written to localStorage.
4. **Rehearse:** copy the secret **before** starting. Start full rehearsal,
   wait through 3–2–1, type/paste the secret into the entry field, then press
   **Unlock** or **Enter** while audio is playing. There are no cue windows.
   The first explicit submission stops the carrier and triggers decryption
   immediately. No need to wait for the song's end. One submission per rehearsal;
   retries are allowed by starting another full rehearsal. You must pass before
   downloading. Going back and changing a payload or protection invalidates it.
5. **Download:** save the original carrier plus its appended encrypted package,
   e.g. `after-hours.xhang.wav`. After download, sender plaintext, credential
   strings and mutable voice buffers are discarded as far as JavaScript allows;
   the package is finalized. Use **Start another** to create something else.

**Share the key/passphrase through a different trusted channel from the file.**
The website cannot recover a forgotten secret. Never use the public practice key
for private messages. Use an HTTPS host you trust and secure endpoint devices.

### Credential modes

**Generated key (default / recommended):** 32 CSPRNG bytes from
`crypto.getRandomValues` (256 bits), encoded as `xk3_` + canonical unpadded
base64url. Copy exactly; key characters are case-sensitive. Leading/trailing
copy whitespace is ignored; internal changes are not. HKDF-SHA256 with a fresh
16-byte salt derives a per-file AES-256-GCM key with fixed domain-separation info
`xhang/v3/aes-256-gcm`. Generated root keys are never put in the package.

**Long passphrase:** Argon2id v19, **64 MiB memory, 3 passes, one lane**, 32-byte
output, domain personalization `xhang/v3/passphrase`. The UI requires 24–1024
characters and rejects obvious repetition/very low variety. These are guardrails,
not entropy estimates. `Justin` is rejected. Prefer independent randomly selected
words, or use the included random grouped-letter generator (32 independently
random lowercase letters, grouped with spaces; about 150 bits of randomness).
The generator is **not** a word-list generator. Passphrases are case-sensitive,
spaces count, and Unicode is normalized to NFC. Do not invent a familiar sentence
and assume that length proves security.

Argon2id executes in a serialized worker using pinned `@noble/hashes`, with
fixed validated parameters and an 80 MiB working-allocation ceiling passed to
the library (not a total process-memory guarantee). Its actual work progress is
reported to the UI. It can take several seconds or longer on slower phones.
There is **no weaker KDF fallback** on unsupported/out-of-memory devices: the
operation fails instead. HKDF mode is fast because its input is already random;
HKDF is not used to stretch human passwords. Test vectors include RFC 9106.

### Receiver — Unlock

1. Download the exact shared file. Open **Unlock** and select it.
2. Copy the full secret before starting. The app checks framing and compares the
   carrier hash to package metadata. This public comparison alone is **not**
   authentication; only successful AES-GCM authentication establishes validity.
3. Start audio and wait for the countdown. Entry becomes enabled when playback
   starts. Type or paste the key/passphrase. There are no expected-length labels,
   cue markers, counters, fixed-size character boxes, or per-keystroke guesses.
   The standard password field masks only what you yourself enter.
4. Press **Unlock** or Enter before playback finishes. Submission consumes the
   sole attempt, stops the carrier, and immediately starts local verification /
   decryption. The cryptographic work may finish after the playback deadline if
   submission was timely. A successful result shows **Decryption completed**,
   followed by text + Copy or the original voice-note player + Download original.
   The voice note is your actual original recording, not an AI recreation. It
   does not auto-play, to avoid unexpectedly exposing a private message.
5. Wrong credentials, tampering, expired playback, or interruption yield the
   same **Nothing unlocked.** No unauthenticated plaintext is released.

A real package is marked used in this browser **when Start is pressed**, before
countdown. The one-submission rule is stricter than just blocking second button
clicks: it permits no second start for that package in that browser. Switching
tabs or leaving the window during countdown/playback ends the attempt. No pause,
seek, speed change or carrier replay is provided. The playground transport is
disabled on Unlock. Practice allows unlimited retries.

**This is only a browser game rule.** Clearing storage, using another browser,
or modifying client code bypasses attempts and the playback deadline. An attacker
with the downloadable file can guess credentials offline. Strong, random secrets
and authenticated encryption—not the countdown or hidden controls—are protection.

### Public practice

Choose **Try the public practice demo** in Unlock. Its public key is displayed
and copyable before starting. Start, paste, and submit during the music. Real
uploaded packages never display their secret. The practice key intentionally
ships in the source and is not suitable for confidentiality.

### Piano and graphics

A–Z map by physical `event.code` to 26 chromatic semitones from C3 / MIDI 48.
Shift raises pitch an octave. Pointer/touch, Enter and Space play the onscreen
piano, and its Shift latch affects touch pitch. Repeated letter keydown events
are ignored in the attempt field. Normal field input supports case, punctuation,
spaces, editing, and paste; Ctrl/Cmd shortcuts are not captured.

The piano is an **interaction**, not the cryptography. Onscreen piano taps add
lowercase letters to the active attempt; their Shift latch changes pitch only.
For complex generated keys or passphrases, use the input field / paste. There
is no legacy Shift-flag/event.code password format in v3. While typing in the
attempt field, letter notes play without changing the native text input.

Five polyphonic Web Audio synth presets are included, with no sample downloads:
piano-like, electric piano, organ, marimba and pad. Piano mute does not mute the
carrier. AudioContext starts/resumes on user gesture. A shared analyser sees
both sources (fftSize 2048, smoothing 0.8). Key flashes/sounds never indicate
correctness or expected length. The shared rAF loop draws spectrum, song-only
waveform/playhead, and audio-reactive aurora/grid/particles; background DPR is
capped at 2 and particles reduce on slow frames. Animation stops while hidden.
Calm mode / reduced motion disable decorative movement. Font/icons are local.

## Format and security

AES-256-GCM uses a fresh random 12-byte IV and 128-bit tag. Every package also
has a fresh 16-byte salt. The exact UTF-8 header bytes are authenticated as AAD:

```text
[original carrier bytes, unchanged]
[uint32 LE header-byte length]
[UTF-8 JSON header / AES-GCM AAD]
[ciphertext including 16-byte authentication tag]
[uint64 LE appended-block byte length]
[8-byte magic: ASCII XHANGv3 + NUL]
```

Block length covers the uint32, header and ciphertext, excluding original audio
and the 16-byte footer. Header is capped at 64 KiB; ciphertext at 10 MiB + tag;
carrier at 50 MiB. Unknown fields, unknown KDFs, legacy versions, unsafe KDF
settings, invalid lengths, malformed arrays, invalid key encoding and unsupported
payload MIME types are rejected. Files never select arbitrary Argon2 costs.

The only header fields are `version` (3), `salt`, `iv`, `mime`, `carrierHash`
(lowercase SHA-256 hex of original carrier bytes), and `kdf`:

```json
{ "name": "HKDF-SHA256" }
```

or:

```json
{
  "name": "Argon2id",
  "memory": 65536,
  "iterations": 3,
  "parallelism": 1,
  "version": 19
}
```

There is no plaintext secret, password length, cue schedule, per-letter verifier
or checksum. KDF mode/parameters, payload MIME, approximate payload size and
carrier hash are public. Generated keys have a public fixed format and security
size; absence of a secret-length counter does not conceal algorithm parameters.
The payload is appended, **not encoded into the audible piano pitches**. It is
discoverable: hiding is not protecting. Compatibility with every external audio
player/codec is not promised; the whole appended demo WAV is decoder-tested.

A carrier hash alone is replaceable by an attacker. Its inclusion in authenticated
AAD is what binds the original carrier to the encrypted message: replacing both
audio and public hash still fails GCM authentication without the secret.
Encryption prevents neither phishing nor a malicious recipient recording audio.
This is an **unreviewed prototype**, not an audited high-risk secure messenger,
not “uncrackable,” and not an authentication of the sender's real-world identity.

Passwords/key buffers are copied into the worker, overwritten in the main
thread after posting, then worker input/derived mutable buffers are overwritten
where possible; Web Crypto AES keys are non-extractable. **Immutable JavaScript
strings, browser DOM values, clipboard history, GC, and native key lifetimes
cannot be reliably zeroized.** Revealed voice data exists in a Blob URL until
navigation/replacement; URLs are revoked on cleanup. Text stays visible until
navigation. Clipboard Copy puts the secret/plaintext into OS clipboard history.
Never promise memory-erasure guarantees in a browser.

Only the full-file SHA-256 hash and `true` flag are persisted under
`xhang-used-v1` in localStorage (this storage name is independent of package
version). No credentials/messages/audio are stored there. Demo assets and the
worker preload during page startup. Subsequent production interactions use
memory and local Blob URLs: no post-load network requests, backend, analytics,
accounts or uploads. Development Vite HMR's local WebSocket is not production.

## Sharing safely

Send as an attachment / WhatsApp **Document** / Telegram **as file** / email,
or a Drive link where the recipient **downloads the original**, not its preview.
Never send as a compressed voice message or assume video/audio conversion
preserves the block. Re-encoding, normalizing and trimming can destroy it. Test
your actual sharing route and devices; this release does not claim a verified
WhatsApp phone-to-phone roundtrip. Renaming `.mp3` to `.mp4` does not convert it.
MP4 video, compression-resistant embedding and WAV LSB embedding are not included.

## Commands

All direct versions are exact; use the included lockfile. There is one runtime
library (`@noble/hashes`), bundled locally. Node/browser Web Crypto supplies AES,
HKDF, SHA-256 and randomness. No API keys or database are required.

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | http://localhost:5173                     |
| `npm run typecheck` | Strict TypeScript                         |
| `npm run lint`      | ESLint                                    |
| `npm test`          | Build, then all Vitest tests              |
| `npm run e2e`       | Five Playwright e2e tests; owns port 5174 |
| `npm run build`     | Static `dist` output                      |
| `npm run preview`   | Production build at http://localhost:4173 |

```sh
npx playwright install chromium
# Minimal Linux may also need OS libraries (admin rights):
npx playwright install --with-deps chromium
npm run lint
npm run typecheck
npm test
npm run e2e
```

The e2e tests use test-mode fake AudioContext elapsed time, but real AudioBuffer
playback scheduling, crypto worker, production Argon2 settings, file format, and
browser decoding. The main flow test covers generated-key text, wrong rehearsal,
explicit immediate submit, no pre-submit plaintext, actual MediaRecorder via a
synthetic browser microphone, exact uploaded four-second voice recovery with
Argon2id, weak-passphrase blocking, whole-appended-WAV playback, carrier tampering,
no secret-length metadata, used flags, expiration, and blur. It runs offline
after startup. Four additional regression tests cover actual insecure HTTP, missing Web Crypto,
audio resumption before encryption, and retry after a setup error. The fake-clock
bridge is stripped from production and tested.
Do not deploy a `--mode test` build.

Unit tests cover HKDF/Argon2 encryption, Unicode normalization, wrong secrets,
raw-AAD tampering, carrier replacement plus forged public hash, bounded format
and KDF validation, RFC 9106 Argon2id known-answer vector, credentials, original
voice-byte preservation and timing/submission boundaries. Production-only CSP,
relative paths and no inline script are also checked.

Optional additional **actual-clock** production smoke (two terminals):

```sh
# Terminal 1
npm run build
npm run preview

# Terminal 2
node scripts/production-smoke.mjs
node scripts/rehearsal-smoke.mjs
```

Verifies early explicit decryption under real AudioContext time, both credential
modes, exact recovered voice bytes, strict production CSP, no post-load HTTP
requests, offline interaction, blur failure, and mobile overflow. This is local
Chromium verification, not a claim of a multi-device security audit.

Binary API calls use owned ordinary ArrayBuffers for compatibility with both
the pinned TypeScript 5.7.3 and newer TypeScript 5.9 DOM typings. If VS Code uses
a different version, select **TypeScript: Select TypeScript Version → Use
Workspace Version**, then restart its TS server. No unsafe type casts are used
to bypass Blob/Web Crypto buffer incompatibilities.

## Build and deploy manually

```sh
npm run build
npm run preview
```

`base: './'` makes assets relative. Tabs use hashes (`#play`, `#hide`, `#unlock`,
`#learn`), with no server router/fallback. Drag generated `dist` to Netlify Drop
or Cloudflare Pages Direct Upload and use HTTPS. No deployment is performed by
this project or update. No git/GitHub workflow is required to run or deploy it.

The existing build-only Vite plugin inserts this unchanged CSP (none in dev):

```text
default-src 'self'; script-src 'self'; worker-src 'self' blob:;
media-src 'self' blob:; img-src 'self' data: blob:;
style-src 'self'; connect-src 'self'
```

Pure-JavaScript Argon2id needs neither `wasm-unsafe-eval` nor `unsafe-eval`.
No CDN scripts, remote fonts, service worker or external sample downloads exist.

The additional rehearsal smoke uses real countdown/playback time under production
CSP for generated-key and Argon2id sender rehearsals, without ever touching the
playground. The test browser has no permissive autoplay launch flag.

## Clean source structure

```text
src/
  main.ts               # tabs, piano events, shared render loop
  style.css             # tokens, responsive UI, motion
  audio/
    engine.ts           # local polyphonic synth + source playback
    analysis.ts         # waveform helpers
    voice-file.ts       # validate original uploaded voice notes
  core/
    credentials.ts      # CSPRNG keys, passphrase guardrails, binary buffer helper
    session.ts          # clock-injectable one-submission gate
    runner.ts           # AudioContext-clock orchestration
    attempts.ts         # browser-only used-file flag
    demo.ts             # eager asset cache and public practice key
  crypto/
    format.ts           # strict v3 parser/header/framing
    carrier.ts          # carrier hash check
    kdf.ts              # Argon2id + HKDF key derivation
    operations.ts       # AES-GCM operations and cleanup
    kdf.worker.ts       # serialized crypto worker + real KDF progress
    index.ts            # worker dispatch + decryptPackage
  ui/
    hide.ts             # sender's five steps
    unlock.ts           # receiver/practice and original voice reveal
    entry.ts            # single explicit credential submission form
    dom.ts              # UI helpers
    spectrum.ts
    timeline.ts
    background.ts
    types.ts
public/
  demo.wav              # unchanged original synthesized audio
  demo.xhang.wav        # fresh v3 encrypted practice package
  fonts/                # local Space Grotesk + OFL license
  licenses/             # bundled noble-hashes MIT license
  favicon.svg
scripts/
  make-demo.mjs         # fresh salt/IV each regeneration
  production-smoke.mjs
tests/                  # Vitest + five Playwright e2e tests
```

Legacy key/onset utility modules may remain as harmless source utilities;
cryptographic protection does not use them. Do not upload generated dependencies,
build output, test artifacts or private audio/keys to a source repository.
`node scripts/make-demo.mjs` regenerates the demo package; its root key is
intentionally public. App and original demo are MIT. Font is SIL OFL. Third-party
MIT notices ship in `public/licenses/` and the production output.
