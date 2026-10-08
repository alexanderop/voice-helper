# Talk Coach

Talk Coach is an offline-first PWA for two-minute speaking drills. You answer one prompt out loud, and the app counts your fillers ("um", "uh", "yeah"), your hedges ("I think", "maybe"), your pauses, and your pace. Speech recognition runs on your phone. Audio never leaves the device and is never stored.

Live app: https://alexanderop.github.io/voice-helper/

## Test it on an iPhone

1. Open https://alexanderop.github.io/voice-helper/ in Safari.
2. Tap **Share**, then **Add to Home Screen**, then open Talk Coach from the Home Screen.
3. While online, tap **Download the speech model** on the setup screen. The download is 77 MB of model weights plus a 22 MB speech engine. Keep the screen open until **Start practicing** appears.
4. Record a drill on **Today**, or go to **Progress** and choose **Analyze an audio file**.
5. Open **Settings** and read **Diagnostics**. It lists the backend, whether the page is cross-origin isolated, the model load time, the last transcription time with its audio length and real-time factor, memory, storage, whether storage is persistent, and the microphone permission. **Copy diagnostics** puts the values on the clipboard.

To check the open risks from the research, measure these on the phone:

- The transcription time for a full two-minute drill.
- Whether the microphone still works after you close the installed app and open it again.
- Whether the header still says **Offline · ready** a few days later. Safari can evict the model, and the setup screen returns if it does.

## What it does

- **Setup** downloads `onnx-community/whisper-base.en` (q8) once. The app says **Offline · ready** only after it finds every model file and the engine binary in the local cache.
- **Today** shows one prompt that changes daily, a 2:00 timer that stops on its own, and 30-second rehearsals for a talk's opening and closing.
- **Result** shows the counts, the transcript with fillers underlined solid and hedges dotted, and one coaching line. **Try this prompt again** returns to the same prompt.
- **Progress** charts fillers per drill and lists imported talks with fillers per minute. You can import an audio file, or captions as `.vtt`, `.srt`, or `.txt`. Captions work without the model, but they often drop "um" and "uh".
- **Settings** has the theme, a JSON export, **Delete all data**, and the diagnostics panel.

The counts are estimates. Whisper drops most "um" and "uh" by default. Talk Coach feeds it a prompt full of fillers, which the research measured at 18 counted against 13 in reference captions on four minutes of one speaker. Pauses are silences of one second or more, found from the loudness of the audio, not from a voice detector.

## Run locally

Use Node.js 22.12 or newer and pnpm 10.28.2.

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:4173. Use a production preview to test the service worker:

```sh
pnpm build:app
pnpm --filter @talk-coach/web preview
```

To serve the app under the GitHub Pages path, set `VITE_BASE_PATH=/voice-helper/` for both commands.

## Verify changes

```sh
pnpm verify
pnpm test:unit
pnpm exec playwright install chrome
pnpm test:browser
pnpm build
pnpm test:e2e
```

`pnpm verify` checks types, lint, import boundaries, dead code, and formatting. Unit tests cover the lexicon, the analysis, the coaching rules, caption parsing, pause detection, the session state machine, and the drill service. Browser tests use real IndexedDB in Chrome. The Playwright journeys run a production build under `/voice-helper/` and never download the model. They cover first-launch setup, caption import, persistence after a reload, deleting all data, the theme, and reopening saved results offline.

## Workspace

| Package                | Responsibility                                                                    |
| ---------------------- | --------------------------------------------------------------------------------- |
| `apps/web`             | The Talk Coach PWA: features, composition, IndexedDB, the speech worker           |
| `packages/ui`          | `@talk-coach/ui`, the Plainspoken tokens, buttons, cards, the app shell, Histoire |
| `packages/result`      | `@talk-coach/result`, typed `Result` values vendored from better-result           |
| `packages/composables` | `@talk-coach/composables`, small Vue composables for events and `localStorage`    |

Read [the architecture](docs/architecture.md) for the feature layout and the import rules.

## Deployment

The CI workflow deploys `apps/web/dist` to GitHub Pages after every check passes on `main`. The workflow reads the base path from `actions/configure-pages`. Hash routing lets every screen reload on a static host.

## Credits

`packages/result` is a copy of [better-result](https://github.com/dmmulroy/better-result) 3.0.1 by Dillon Mulroy. `packages/composables` adapts composables from [VueUse](https://github.com/vueuse/vueuse). Speech recognition uses [Transformers.js](https://github.com/huggingface/transformers.js) and the Whisper base.en ONNX export from `onnx-community`.

## License

MIT.
