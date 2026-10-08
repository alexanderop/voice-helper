# Project conventions

Use pnpm from the repository root. Keep the lockfile in sync when changing dependencies.

## Commands

- `pnpm dev` starts the example app.
- `pnpm dev:ui` starts Histoire.
- `pnpm verify` runs typechecking, type-aware lint, architecture checks, dead-code checks (Knip), fitness tests, and formatting checks.
- `pnpm test:fitness` checks repository-wide architecture rules in `architecture/`.
- `pnpm test:unit` covers domain rules and application outcomes.
- `pnpm test:browser` runs component and native IndexedDB tests in Chrome.
- `pnpm test:e2e` runs the production PWA journeys.
- `pnpm build` builds the app and Histoire.

## Ownership

Keep features in `apps/web/src/features`. Each feature owns its domain, application service, ports, adapters, and UI. Wire concrete dependencies in `app/bootstrap.ts`. Import other features through their public entry point.

Keep `packages/ui` independent of application features and persistence. Reuse exported production components in Histoire. Keep component examples in English. Validate browser interactions in the real application after checking them in isolation.

Use native IndexedDB. Validate stored values with Valibot at the adapter boundary. Wait for transaction completion before reporting a successful write. Inject storage, clock, and ID capabilities into application services. Preserve unsaved drafts on errors and during service-worker upgrades.

Prefer native Vue reactivity and ordinary function parameters. Add dependencies only when they remove meaningful complexity. Use strict TypeScript and avoid suppression comments.

## Verification

Choose the smallest test layer that exposes the failure. Use real IndexedDB in browser adapter tests. Keep production service workers real in offline and update journeys. Do not replace the mechanism a test claims to prove.

Keep formatting in Prettier and Vue semantics in ESLint. The architecture check includes forbidden-import fixtures to verify the check itself.
