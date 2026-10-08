# Project conventions

Use pnpm from the repository root. Keep the lockfile in sync when changing dependencies.

## Commands

- `pnpm dev` starts the app.
- `pnpm dev:ui` starts Histoire.
- `pnpm verify` runs typechecking, type-aware lint, architecture checks, dead-code checks (Knip), fitness tests, and formatting checks.
- `pnpm test:fitness` checks repository-wide architecture rules in `architecture/`.
- `pnpm test:unit` covers the drills and speech domain rules and the drill service.
- `pnpm test:browser` runs component and native IndexedDB tests in Chrome.
- `pnpm test:e2e` runs the production PWA journeys under `/voice-helper/`. They never download the speech model.
- `pnpm build` builds the app and Histoire.

## Ownership

Keep features in `apps/web/src/features`: `drills`, `speech`, and `settings`. Each feature owns its domain, application service, ports, adapters, and UI. Wire concrete dependencies in `app/bootstrap.ts`. Import other features through their public entry point. Browser capabilities that are not a feature (microphone, audio decoding, device diagnostics, the service worker) live in `platform/`.

Keep `packages/ui` independent of application features and persistence. Reuse exported production components in Histoire. Keep component examples in English. Validate browser interactions in the real application after checking them in isolation.

Use native IndexedDB. Validate stored values with Valibot at the adapter boundary. Wait for transaction completion before reporting a successful write. Inject storage, clock, and ID capabilities into application services. Never store raw audio. Validate messages from the speech worker with Valibot.

Add a counted phrase to `features/drills/domain/lexicon.ts` and a coaching rule to `features/drills/domain/coaching.ts`. Do not add branches elsewhere. Do not precache the speech model or the ONNX runtime binary.

Prefer native Vue reactivity and ordinary function parameters. Add dependencies only when they remove meaningful complexity. Use strict TypeScript and avoid suppression comments.

## Verification

Choose the smallest test layer that exposes the failure. Use real IndexedDB in browser adapter tests. Keep production service workers real in offline and update journeys. Do not replace the mechanism a test claims to prove.

Keep formatting in Prettier and Vue semantics in ESLint. The architecture check includes forbidden-import fixtures to verify the check itself.
