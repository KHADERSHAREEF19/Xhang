# xhang 3.0.1 — Step 4 rehearsal fix

## No external service is needed

Step 4 needs **no API key, Python package, backend, database, or environment
variable**. The required Node/npm dependencies are already pinned in
`package.json` / `package-lock.json`. Install them with `npm ci`. At runtime,
the browser runs Web Audio, Web Crypto and the bundled local JavaScript worker.
The generated private key/passphrase is your encryption credential, not an API key.

## What was wrong

The old `rehearse()` sealed/encrypted the payload before creating the entry field.
Its catch block translated every setup error into `Nothing unlocked.` In the
reported insecure HTTP environment, SHA-256 / AES / HKDF Web Crypto cannot run;
that exception happens before the session starts. This explains the missing
input and immediate failure without a submitted credential. Playing ordinary
audio does not establish Web Crypto availability.

AudioContext resumption also happened after asynchronous encryption, potentially
losing transient user activation in browsers with stricter autoplay rules. That
was a separate portability risk, not a proven cause of the reported HTTP failure.

## Changes, narrowly scoped

- Check secure context and Web Crypto on Step 4 and again before starting.
- Explain insecure HTTP / unavailable Web Crypto and disable Start when known
  unavailable. No insecure fallback or CSP relaxation was introduced.
- Resume/check the AudioContext from the button click before encryption awaits.
- Keep a visible, disabled credential field on Step 4 before starting.
- Show the real countdown and entry instructions in Step 4 itself; the playground
  is not required to complete rehearsal.
- Show actionable setup errors for audio, encryption or playback. Setup failure
  remains retryable without being presented as a wrong-secret attempt.
- Preserve generic `Nothing unlocked.` for incorrect submitted credentials,
  expired playback and blur/hidden-tab interruption.
- No encryption format, KDF costs, attempt rules, or secret handling was weakened.
  Existing v3 encrypted packages remain compatible. v1/v2 remain unsupported.

## Apply

Recommended: extract **xhang-v3.0.1-source.zip** into a new folder.
Alternatively extract **xhang-step4-fix.zip** into the existing v3.0.0 project
root and overwrite every included file, preserving its folder structure.
No files need deletion. Patch includes test/docs/version files as well as code.

Use Node 20.19+:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173 on the same computer**, or deploy normally to Vercel
and open its **HTTPS** URL directly. HTTP on a LAN/IP address such as
`http://192.168.x.x:5173` is not supported. No code change can enable Web Crypto
on an origin the browser considers insecure. Do not disable browser security.
Restart the server and hard-refresh after updating. `npm pkg get version` should
report `3.0.1`.

## Rehearse without the playground

Choose carrier → add text or voice → save generated key / strong passphrase →
Step 4 → click Start full rehearsal → wait through countdown → paste/type into
the Step 4 input → press Unlock or Enter during playback → Rehearsal passed.
Keep the page focused. Copy your secret before starting; switching windows or
tabs during the active session still intentionally fails the attempt.

## Verification

- Lint, strict TypeScript and production build pass.
- TypeScript 5.9.3 compatibility check also passes.
- **36 unit tests** across eight files pass.
- **Five Playwright tests** pass: the original complete offline text/voice flow
  plus actual insecure HTTP, missing Web Crypto, audio-resume-before-encryption,
  and recovery/retry after an injected encryption setup failure.
- Actual-clock production sender check passes for generated-key and Argon2id
  rehearsals, with visible countdown, explicit early submit, no playground
  interaction, no post-load HTTP requests, offline use and unchanged strict CSP.
  It runs without a permissive autoplay launch flag.
- Existing actual-clock production receiver smoke also passes, including original
  voice bytes, CSP, blur and mobile overflow checks.

These are local automated Chromium tests, not a test of your particular browser,
Vercel deployment, microphone hardware, or a security audit.

Reproduce browser checks with:

```sh
npx playwright install chromium
npm run e2e
```

For production smoke, first run `npm run build` and `npm run preview` in one
terminal, then in another:

```sh
node scripts/rehearsal-smoke.mjs
node scripts/production-smoke.mjs
```
