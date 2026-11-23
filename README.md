<p align="center">
  <img src="public/xhang-logo.png" alt="xhang — musical X logo" width="360">
</p>

# 🎵 xhang

### A private voice inside a familiar sound.

## 🌐 [Try xhang live →](https://xhang.vercel.app/)

**https://xhang.vercel.app/**

Hide an encrypted text message or voice note inside an audio file. Share the file, send its secret separately, and let someone unlock it during playback.

**Version 3.0.1 · Works in your browser · No API key or Python needed**

## ✨ What can it do?

- 🔐 Protect text or your original voice note.
- 🎧 Use a song, piano tune, speech, or background sound as the carrier.
- 🔑 Choose a generated key or a long passphrase.
- 🎹 Try the local piano and audio visuals.
- 💻 Process your messages locally—no app accounts or file uploads.

## 🚀 Start locally

Install **Node.js 20.19 or newer**, open the project folder, and run:

```bash
npm ci
npm run dev
```

Open **http://localhost:5173** on the same computer.

> 🪟 If PowerShell blocks `npm`, use `npm.cmd ci` and `npm.cmd run dev` instead.
>
> 🌐 Use **localhost or HTTPS**. HTTP network links such as `192.168.…` or `172.…` may block Web Crypto. Do not open `index.html` directly.

## 📝 How to use it

### 📤 Sender — Hide a message

1. **Choose audio:** upload a carrier file or use the demo.
2. **Add your secret:** type a message, record your voice, or upload a voice note.
3. **Save the key:** copy the generated `xk3_…` key, or choose a strong long passphrase.
4. **Rehearse:** click **Start full rehearsal**, wait for the countdown, paste/type the same secret, then press **Unlock / Enter** before playback ends. No piano or cue timing is needed.
5. **Download and share:** send the audio as an original file attachment. Send its key/passphrase through a different trusted channel.

> 🔑 If you choose **Generated key**, use that exact `xk3_…` key—not a new password. Keep your copy safe; xhang cannot recover it.

### 📥 Receiver — Unlock a message

1. Open **Unlock** and select the shared file.
2. Copy the key/passphrase before starting playback.
3. Start the audio, wait for the countdown, and enter the secret.
4. Press **Unlock / Enter** before the track ends.
5. Read the text or play/download the original voice note. 🎉

**Stay in the same tab and window during the attempt.** There are no timing targets or letter-by-letter checks. Try the **public practice demo** first for unlimited retries.

```text
Sender                                     Receiver
Choose audio → Add secret → Save key
                  ↓
          Rehearse → Download
                  ↓
         Share original file ───────────→ Open in Unlock
         Send key separately ──────────→ Play → Enter key
                                                   ↓
                                          Unlock → Read / Listen
```

## 🧠 Algorithms we use

| Algorithm | What it does |
| --- | --- |
| **AES-256-GCM** | Encrypts the message and detects changes to its encrypted content and header. |
| **HKDF-SHA256** | Turns the generated random key into a separate encryption key for each file. |
| **Argon2id** | Makes passphrase guessing more costly: 64 MiB memory, 3 passes, 1 lane. |
| **SHA-256** | Hashes the original carrier audio; that hash is included in the authenticated header. |
| **Browser secure randomness** | Creates 256-bit generated keys, fresh salts, and encryption IVs. |

Argon2id uses the bundled **`@noble/hashes`** library in a local worker. There is no external encryption service. Passphrases need **24–1024 characters** and must pass basic checks, but length alone does not make a passphrase strong.

## 📁 Project structure

```text
xhang/
├── src/
│   ├── audio/       # Piano, playback, voice files
│   ├── core/        # Keys, session rules, environment checks
│   ├── crypto/      # Encryption, hashing, file format, worker
│   ├── ui/          # Hide, Unlock, and visuals
│   ├── main.ts      # App navigation
│   └── style.css    # Styles
├── public/          # Demo audio, fonts, icons, licenses
├── scripts/         # Demo generator and browser checks
├── tests/           # Unit and browser tests
├── package.json     # Commands and dependencies
└── LICENSE          # MIT license
```

## 📎 File support

| Content | Formats / limits |
| --- | --- |
| Carrier audio | MP3, WAV, OGG, M4A · up to 50 MiB · at least 6 seconds |
| Secret voice | MP3, WAV, OGG, WebM, M4A · up to 10 MiB / 60 seconds |
| Secret text | Up to 10,000 characters |

Browser audio support varies. Uploaded voice bytes are kept without conversion. **MP4 video is not supported.**

## 🌍 Build and publish

```bash
npm run build
npm run preview
```

The website is built into **`dist`**. Preview it at **http://localhost:4173**.

For **Vercel or Cloudflare Pages**, use:

```text
Framework:        Vite
Build command:    npm run build
Output folder:    dist
Environment keys: None
```

For manual hosting, upload the **whole `dist` folder**, including its subfolders. For a Git-connected deployment, push the source, not `node_modules` or `dist`. Keep private audio and secrets out of the repository.

## 🛡️ A few important notes

- This is an **unaudited prototype**, not a tool for high-risk secrets.
- The one-try rule and playback deadline are **browser rules**, not a way to stop offline password guessing. Use random keys or strong passphrases.
- Encrypted data is appended to the file—not hidden in the audible piano notes. It can be found.
- Share the original as a **Document / file attachment**. Trimming or converting it can destroy the message.
- Version 3.0.1 opens v3 packages. Older v1/v2 files need to be recreated.
- If Step 4 cannot start, check **localhost / HTTPS** first. See [STEP4-FIX.md](STEP4-FIX.md) for more help.

## 🧪 Checks

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run e2e
```

The v3.0.1 checks passed **36 unit tests and 5 browser tests**, plus real-clock production checks. These checks are not a security audit.

## 🔮 Future ideas

These are **possible improvements, not features available today**:

- 📱 More testing on phones and across browsers.
- ♿ Better screen-reader support and keyboard guidance.
- 🌐 More interface languages.
- 🎙️ More voice-format support where browsers allow it.
- 🔍 An independent security review.
- 🧩 Research into hiding data within the audio signal, with clear limits around compression and conversion.

## 📄 License

**MIT** — see [LICENSE](LICENSE). Font and library notices are included in `public/fonts` and `public/licenses`.
