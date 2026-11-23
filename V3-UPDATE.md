# xhang v3.0.1 — final code update

See `STEP4-FIX.md` for the Step 4 startup/environment correction. No API key or Python package is required.

## Install

**Recommended:** extract `xhang-v3.0.1-source.zip` into a new folder, open it in VS Code,
then use Node 20.19+:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Do not open index.html directly.

**Existing project:** extract `xhang-step4-fix.zip` into the old project's
root and overwrite all included files, preserving the folder structure. Run
`npm ci`, restart the server and refresh the browser. This archive contains only
new/changed files relative to the prior workspace version; no deletions are
required. Use the complete source archive if your local copy has other changes.

## Implemented

- MP3/WAV/OGG/M4A carrier sound: music, piano, ambient or speech.
- Text secret, microphone voice recording, or original uploaded voice note.
- Recommended 256-bit generated key + HKDF-SHA256.
- Optional long passphrase + Argon2id (64 MiB / 3 passes / 1 lane).
- AES-256-GCM with authenticated carrier SHA-256 and KDF/header settings.
- One explicit Unlock/Enter submission during playback, immediate decrypt attempt.
- No cue schedule, expected secret-length hint, or per-letter verification.
- Mandatory successful sender rehearsal before download.
- Original voice player + byte-preserving download after successful decryption.
- Static/local architecture; pinned bundled JavaScript Argon2; unchanged strict CSP.
- Updated README and standalone `public/how-to-use.html` walkthrough.

## Verification completed

- ESLint: pass.
- TypeScript 5.7.3 (pinned) and 5.9.3: pass.
- Production build: pass; test-only bridge absent.
- Vitest: **36 tests passed** across eight files.
- Playwright: **five browser tests passed** (one comprehensive offline flow plus four setup regressions), including
  sender and receiver for both credential modes, synthetic-microphone recording,
  original uploaded voice recovery, wrong rehearsal, tampering, no pre-submit
  plaintext, expiry, blur and local used flags.
- Separate actual-clock production smoke: pass for early submission, both KDFs,
  exact original voice bytes, strict CSP, no post-load HTTP requests, offline use,
  blur interruption and 390px mobile overflow check.
- npm dependency audit: zero known vulnerabilities reported at verification.

These automated Chromium checks are not a security audit, a real microphone
hardware test, a phone-to-phone sharing test, or a promise of codec support on
every browser. Slow devices may take longer for Argon2id.

## Important limitations

**v3 does not open v1/v2 encrypted packages. Recreate/reseal old files.** The
original plain demo WAV is unchanged, but the encrypted practice package is new.

The one-attempt limit and playback deadline are bypassable browser rules. Keys
and strong random passphrases protect against offline guessing; a countdown does
not. This is an unaudited prototype. Send the exact file as a Document/attachment
and share its secret separately. Re-encoding or trimming can destroy the payload.
MP4 video and conversion-resistant signal steganography are not included.

No deployment, git initialization, push or external application upload performed.
