# xhang

**Hide secrets inside music.**

A static, client-side musical cipher. Append an encrypted text message or voice
note to a song. The recipient follows public timed cues and plays a secret
letter sequence to reveal the message. No account, backend, analytics, or
third-party runtime services. No git, GitHub, or deployment is needed.

## Open locally in VS Code

1. Open this folder in VS Code, including if it is inside your Google Drive folder.
2. Use **Node 20** (`.nvmrc` is provided; validated with Node 20.20.2).
3. Open the VS Code terminal in this folder and run:

   ```sh
   npm install
   npm run dev
   ```

4. Open **http://localhost:5173** in a modern browser.
   **Don't double-click `index.html`.** `file://` is not supported. Web Crypto,
   AudioContext, workers, and microphone permissions need localhost or HTTPS.

All direct dependency versions are exact, transitive versions are captured in
`package-lock.json`, and a pinned minimatch override fixes an advisory in the
lint toolchain. There are **zero production JavaScript dependencies**.
`npm ci` is also supported for reproducible installs.

### Google Drive hygiene

**Do not sync `node_modules` or `dist` to Google Drive.** They are generated and
can be recreated with install/build. Also exclude `test-results`,
`playwright-report`, and browser caches. Use your sync client's supported
exclusions, or work from a non-synced local copy and copy only source/assets and
the lockfile back to Drive. The included editor exclusions only hide generated
folders in VS Code; **they do not configure or prevent Drive syncing**. This app
never connects to your Drive account or uploads your songs.

## Commands

| Command             | Result                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`       | Vite on http://localhost:5173                                                              |
| `npm run typecheck` | Strict TypeScript checking                                                                 |
| `npm run lint`      | ESLint for source, tests, scripts and configuration                                        |
| `npm test`          | Build, then run all Vitest unit/format/security tests                                      |
| `npm run build`     | Typecheck and create the static `dist` folder                                              |
| `npm run preview`   | Serve the production build on http://localhost:4173                                        |
| `npm run e2e`       | One Chromium Playwright end-to-end test; starts its own test-mode Vite server on port 5174 |

Install the test browser once:

```sh
npx playwright install chromium
# On minimal Linux systems, install OS libraries too (may need admin rights):
npx playwright install --with-deps chromium
npm test
npm run e2e
```

The test server uses `--mode test` to enable an injectable deterministic clock.
It still uses the real Web Audio source, Web Crypto worker, PBKDF2 iterations,
file writer/parser, and UI. **The clock bridge is eliminated from production**;
a build test asserts that. Never deploy a `--mode test` build.

For an additional, optional real-time production check, use two terminals:

```sh
# Terminal 1
npm run build
npm run preview

# Terminal 2
node scripts/production-smoke.mjs
```

This takes about 27 seconds: it unlocks the practice file against the actual
AudioContext clock, verifies strict CSP, checks no post-load network requests,
works with networking disabled, tests interruption failure, and checks mobile
horizontal overflow. It requires the Chromium installation above.

## The four tabs

### Play

Start the original, locally bundled **After hours** demo, or play the keyboard.
Physical keys are mapped by `event.code`, not keyboard layout: **A–Z are 26
consecutive semitones from C3 (130.81 Hz / MIDI 48)**. Hold Shift for an octave
up. Repeated keydown events are ignored. The on-screen piano supports pointer,
touch, Enter, and Space; its Shift toggle latches the upper octave for touch.
AudioContext starts/resumes only after a user gesture.

Five polyphonic Web Audio synth presets are included: piano-like, electric
piano, organ, marimba, and pad. These are **synthesized**, not acoustic samples;
there is no Tone.js or sample-fetch dependency. The mute control mutes only
piano notes. The analyser receives both song and synth; fftSize is 2048 and
smoothing is 0.8.

### Hide — five steps

1. **Upload song:** choose or drop MP3/WAV/OGG/M4A, at most 50 MiB. Decode
   locally, preserve the original bytes, and inspect the waveform. Codec
   support depends on the browser; WAV is the most portable. Songs need at
   least six seconds and enough room for eight non-overlapping cue windows.
2. **Write message:** enter up to 10,000 text characters, or record a voice
   note (60 seconds / 10 MiB maximum). Microphone permission is requested only
   on Record; denial leaves text available. Optionally add a separate
   passphrase (NFC normalized; otherwise whitespace and case are significant).
3. **Set cues:** record a live pass and press at least eight letters; recording
   again replaces that pass. Live captures can snap to an energy onset within
   150 ms. Alternatively, **Generate random letters** uses unbiased rejection
   sampling from `crypto.getRandomValues`, with ten editable spaced cues. The
   onset detector is a lightweight energy heuristic, not a precision beat
   tracker. Small beat ticks are approximate, second labels are exact. Drag
   cue markers, edit their numeric times with the keyboard, or zoom/pan the
   timeline. Hit windows are ±150/200/250 ms (200 default). Keep at least 1.5
   seconds before the first cue, 0.5 seconds after the last, and disjoint
   windows. At most 256 cues. Short sequences, common dictionary words and
   repeated patterns are blocked. The local denylist is a guardrail, **not**
   an exhaustive dictionary or entropy estimate; always generate randomness.
4. **Rehearse:** a freshly encrypted candidate goes through the same Session
   engine and whole-sequence decryption as the receiver. You must complete a
   successful full rehearsal to advance. Rehearsals may be retried; going
   back and changing message, letters, times, or window invalidates approval.
5. **Download:** the downloaded song retains its original audio extension with
   `.xhang` inserted into the name. The letter sequence remains visible for
   sharing until you reset. Sender payload/passphrase buffers are discarded
   after download; the package is then finalized (use Start another to edit a new
   message). Resetting discards the rest of the in-memory sender state.

**Share the letters with your friend through a different channel.** Include
which letters use Shift, plus the passphrase if set. Send the music **as a file**.

### Unlock — one shot

Choose the exact original shared file. The app parses the footer and public
header, validates bounded lengths/times, and decodes only the original audio
portion. No correctness checks happen per letter.

Before starting you may set a latency offset. The default uses outputLatency
or baseLatency when available; the optional click track estimates the median
of at least three tap offsets. This is an estimate, especially over Bluetooth.
A positive offset is subtracted from input time. Nothing is saved.

Starting immediately records the file hash as used, then schedules a 3–2–1
countdown and a fixed-speed `AudioBufferSourceNode`. The clock is
`audioContext.currentTime`, never wall time. There is no seek, pause, or replay.
The playground transport is disabled on Unlock.

At each cue, the **first** A–Z press inside the **inclusive** hit window counts.
Outside presses are ignored with dim feedback. Additional presses cannot
replace a captured letter. A missing cue fails as soon as the clock passes
its right edge. Window blur or a hidden tab fails too. Dots show counts, not
correctness. Cues appear 1.5 seconds ahead with shrinking rings and a target
window. The animation and sound have no access to expected letters.

After the last window closes, one full-sequence key derivation and AES-GCM
decrypt runs. Text resolves into a message box with Copy, or a local Blob URL
voice player appears. Failure always says **“Nothing unlocked.”** and fades
the song. No partial plaintext is shown. Practice uses the same engine but
skips the attempt flag and offers unlimited retries.

**Practice letters:** `R K M F Z B H Q J W`, no Shift, no passphrase.
Cue times: 3, 5, 7, 9, 11, 13, 15, 17, 19, 21 seconds after music starts.

### Learn — the limits, plainly

- **Cue times are public.** Timing is only a UI gate; it adds no entropy to the key.
- Security depends on **length and randomness of the letters** and any passphrase.
  PBKDF2 slows guesses but cannot rescue a weak word. Offline guessing is possible.
- The one-try flag is **only a browser game rule**, bypassable by clearing storage,
  altering the file, switching browsers, or modifying client code. There is no
  server-enforced attempt limit.
- **Hiding data is not protecting it.** The appended block is discoverable;
  authenticated encryption is the protection. This is an unreviewed prototype,
  not an audited secure messenger for high-risk communications.
- **Re-encoding can destroy the payload.** Avoid WhatsApp audio messages, audio
  normalization, trimming, and MP3 conversion. Use an email attachment, Telegram
  **as file**, or a Drive link where the recipient **downloads the original**,
  not the preview. Drive sharing is outside the app.
- Some external players may reject trailing bytes, particularly for less
  permissive container parsers. The real demo WAV is tested with appended data
  in Chromium's decoder; compatibility with every player/codec is not promised.

## Cryptography and file format

Ordered secret pairs are canonicalized as, for example:

```text
KeyR:0|KeyK:0|KeyM:1|...
```

The PBKDF2 input is UTF-8 JSON of `[canonicalSequence, normalizedPassphrase]`,
with an empty passphrase when that factor is off. There are no per-letter
verifiers, hashes, or checksums anywhere in the package. A dedicated worker
uses **PBKDF2-SHA256, 600,000 iterations**, a fresh random **16-byte salt**, and
non-extractable **AES-256-GCM** keys. GCM uses a fresh random **12-byte IV** and
a 128-bit tag. The exact stored UTF-8 header bytes are **authenticated as AAD**.
Changing a cue time, salt, window, payload MIME, or factor flag invalidates it.

```text
[original audio bytes, unchanged]
[uint32 LE header byte length]
[UTF-8 JSON header]
[AES-GCM ciphertext including 16-byte tag]
[uint64 LE appended block byte length]
[8-byte magic: ASCII XHANGv1 followed by NUL]
```

The appended block length counts the uint32 header length, header, and
ciphertext, not the original audio or 16-byte footer. The requested text
`XHANGv1` has seven characters, so a NUL makes the magic explicitly eight bytes.

Header fields: `version`, `salt` (byte array), `iv` (byte array), `cues` (integer
milliseconds), `window`, `N`, `mime`, `passphrase` (boolean), `iterations`.
Version 1 fixes iterations at 600,000. The parser rejects unbounded lengths,
unknown versions, unsupported MIME types, invalid byte arrays, and overlapping
windows before allocating/decoding. Header length is capped at 64 KiB; payload
at 10 MiB. Original audio is deliberately not authenticated by the message tag.

Mutable password/data buffers are overwritten after worker use, captured
letters are cleared after each attempt, and crypto keys are non-extractable.
**JavaScript cannot reliably zero immutable strings or force Web Crypto/GC
memory erasure.** Sender letters must remain available for sharing until reset;
revealed plaintext exists in the DOM until you navigate away. Copying plaintext
puts it in the OS clipboard. No keys, messages, letters, or passphrases are ever
stored in localStorage. The only entry is `xhang-used-v1`, a map of full-file
SHA-256 hash to `true`.

Web Crypto PBKDF2 does not expose real progress. The UI deliberately uses an
**indeterminate progress bar**, not invented percentages. The worker and demo
files preload at app startup; subsequent actions use memory and Blob URLs,
with no network calls in the production app. Development Vite HMR uses a local
WebSocket, which is not part of the static production app.

## Visuals and accessibility

- Self-hosted Space Grotesk variable font with its OFL license; inline SVG icons.
- One shared requestAnimationFrame loop for spectrum, waveform and background.
- Full-screen aurora/grid/particles follow analyser loudness, **never correctness**.
- Background DPR is capped at 2; particle count decreases on frames over 20 ms.
- Animation stops while hidden. Calm mode and reduced motion disable decorative
  background/motion; the functional player remains available.
- Keyboard-accessible navigation, visible focus, labeled controls, numeric
  alternatives to cue dragging, status announcements, native dialog focus
  handling, responsive layout, readable high-contrast text.
- Touch keys wrap into two rows on narrow screens; the Shift latch enables
  upper-octave touch input.

## Tests

`npm test` rebuilds first, so the production CSP assertion never depends on a
stale or missing build. The suite covers:

- AES-GCM/PBKDF2 roundtrip; wrong letters and passphrase failure;
- authenticated header tampering, including cue times and other fields;
- exact inclusive timing boundaries, misses, duplicate presses, interruptions;
- unchanged WAV header/PCM and an actual encrypted demo fixture;
- correctness-independent visual state and local secret-strength guards;
- onset snapping boundaries and framing validation;
- exact production CSP, relative asset paths, no inline script, no test bridge.

The **single Playwright test** creates a message through the UI using the demo,
records letters at deterministic cue times, fails a wrong rehearsal, passes a
correct rehearsal, downloads the real file, confirms Chromium can decode the
**whole appended WAV**, unlocks it with simulated physical keys, verifies only
the used hash is persisted, and confirms the second attempt is blocked. All
interaction runs with the browser **offline after initial load**.

## Build and drag-and-drop deployment

```sh
npm run build
npm run preview
```

Check http://localhost:4173. `base: './'` makes all generated assets relative.
There is no router or server fallback requirement: tabs use `#play`, `#hide`,
`#unlock`, and `#learn`. A Vite `transformIndexHtml` plugin with `apply: 'build'`
inserts this production-only CSP meta tag (dev has none for HMR):

```text
default-src 'self'; script-src 'self'; worker-src 'self' blob:;
media-src 'self' blob:; img-src 'self' data: blob:;
style-src 'self'; connect-src 'self'
```

To deploy yourself, drag **the generated `dist` folder** to **Netlify Drop**,
or use **Cloudflare Pages → Direct Upload** for its contents. Use the resulting
HTTPS site. No API functions, secrets, build service, GitHub repository, or
backend are required. Test a practice unlock on the deployed origin; flags are
origin-local. No deployment was performed as part of this project.

## Source map

```text
src/
  main.ts              # tabs, keyboard input, shared render loop
  style.css            # tokens, layout, motion, breakpoints
  audio/               # polyphonic synth, analyser, waveform/onset analysis
  core/                # clock-injectable session, runner, keys, attempts, demo cache
  crypto/              # bounded file format, Web Crypto operations, PBKDF2 worker
  ui/                  # Hide/Unlock flows, spectrum, timeline, background, DOM helpers
public/
  demo.wav             # original synthesized 25-second demo
  demo.xhang.wav       # real encrypted practice package
  fonts/               # local font + OFL license
  favicon.svg
scripts/
  make-demo.mjs        # optional build-time demo generator, no third-party assets
  production-smoke.mjs # optional real-clock production browser check
tests/                 # Vitest tests and one Playwright e2e test
```

Recreate both demo files with `node scripts/make-demo.mjs` if you intentionally
change the demo; each regeneration uses fresh encryption salt/IV. No runtime
sample/font CDNs are used. The demo music and application source are MIT;
Space Grotesk is SIL Open Font License (see `public/fonts/OFL.txt`).

### Deliberately deferred optional work

Acoustic piano samples/Tone.js, Argon2 WASM, WAV LSB embedding, and a Cloudflare
Worker attempt counter are not included. A server attempt counter would change
the privacy/offline architecture and needs a separate threat model; the current
application intentionally remains entirely static and client-only.
