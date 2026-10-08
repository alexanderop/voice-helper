# Architecture

Talk Coach is one Vue app in `apps/web`. Each feature owns its domain rules, application service, ports, adapters, and UI. `app/bootstrap.ts` builds the concrete adapters and passes them to the routes as props.

## Features

- `features/drills` owns the product. `domain/` holds the `Drill` and `Analysis` schemas, the lexicon of fillers and hedges, the coaching rules, caption parsing, pause detection, the practice helpers, and the session state machine. `application/createDrillService.ts` decodes, transcribes, analyzes, and saves through the ports in `ports/ports.ts`. `adapters/indexeddb` stores drills. `ui/` holds Today, Result, and Progress.
- `features/speech` owns the Whisper model. `domain/model.ts` names the model, the filler prompt, the cached files, and the `ModelStatus` union. `adapters/whisper.worker.ts` runs transformers.js in a Web Worker. `adapters/createWhisperTranscriber.ts` talks to that worker and implements the drills `Transcriber` port. `adapters/modelCache.ts` checks the Cache API. `ui/SetupPage.vue` is the first-launch screen.
- `features/settings` owns the theme picker, the data export and delete, and the diagnostics panel. It receives everything through props.

`platform/audio` records from the microphone and decodes audio to 16 kHz mono. `platform/device` reads diagnostics and asks for persistent storage. `platform/pwa` registers the service worker. Feature UI never imports `platform/`. The app layer passes these capabilities in.

## Data shape

A `Drill` is `{ id, kind, prompt, recordedAt, durationMs, transcript, analysis }`. `kind` is `drill`, `opening`, `closing`, or `import`. `durationMs` is `null` for text captions without timing. `Analysis` holds the word count, words per minute, the pause count, a count per group (`yeah`, `um`, `hedge`), and a count per term. A `null` pace or pause count means unknown, not zero.

Valibot schemas define `Drill` and `Analysis`. The IndexedDB adapter parses every row on read and skips a row that fails. A write reports success only after its transaction commits. Raw audio is never stored.

## Rules as tables

- `domain/lexicon.ts` lists every counted phrase with its group. The matcher tries multi-word phrases first, so "and yeah" counts once, not as "yeah". "Kind of" and "sort of" do not count after a determiner such as "what". The file explains which words are left out and why.
- `domain/coaching.ts` is an ordered list of rules. The first rule that returns a line wins: hedges in the first three sentences, a filler rate 20% lower or higher than the previous drill of the same kind, three or more "yeah", a take with no fillers, and a fallback.
- `domain/session.ts` is the recording lifecycle: `idle`, `requesting-mic`, `recording`, `processing`, `done`, and `error`. A table names the events each state accepts. Any other event leaves the state unchanged.
- `speech/domain/model.ts` is the model lifecycle: `checking`, `missing`, `downloading`, `loading`, `ready`, and `failed`.

## Speech model

The worker loads `onnx-community/whisper-base.en` at `q8` on the WASM backend. transformers.js 3.8.1 has no `prompt_ids` option, so the worker builds `decoder_input_ids` by hand: `<|startofprev|>`, the filler prompt, `<|startoftranscript|>`, and `<|notimestamps|>`. It cuts audio into 30-second chunks and calls `generate` with `max_new_tokens: 220` and `no_repeat_ngram_size: 5`, as `prompt.mjs` in the research did.

transformers.js stores the model in the `transformers-cache` Cache API bucket. The ONNX runtime binary is served from `ort/` on this origin, not from jsDelivr. The service worker keeps it in the `talk-coach-onnx-runtime` bucket with a cache-first rule. Neither the model nor the binary is in the precache. The app shows **Offline · ready** only when `modelCache.ts` finds all seven model files and the binary locally.

WebGPU is not used. The research picked q8 because q4 is larger for these exports, and q8 on WebGPU is not a tested path. GitHub Pages cannot send cross-origin isolation headers, so the WASM backend runs on one thread. Diagnostics shows both facts.

## Import rules

`pnpm check:architecture` enforces these directions:

- Domain, application, and ports import only Valibot, `@talk-coach/result`, and other core files. They use no browser globals.
- A feature imports another feature only through its `index.ts`.
- Feature UI does not import adapters or `platform/`.
- `packages/ui` does not import the app. `packages/composables` imports only Vue, Valibot, and `@talk-coach/result`.

`scripts/test-architecture.mjs` writes nine forbidden imports into a temporary tree and checks that the checker rejects each one. `architecture/fitness.test.ts` checks that every feature has an `index.ts`, every component stays under 300 lines, every IndexedDB adapter imports Valibot, and no file suppresses a lint or type error.

## Follow-ups

- Pauses come from loudness. Silero VAD would separate breath and room noise from speech, at the cost of a dependency and a second model.
- The diagnostics panel keeps the last transcription time in memory. A relaunch clears it.
