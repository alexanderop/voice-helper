# Verification

The UI/UX recovery revision passed these commands on macOS with Node 22.22.3 and Google Chrome. The same application revision passed GitHub CI and live Pages checks.

| Command                          | Result                                                     |
| -------------------------------- | ---------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Passed                                                     |
| `pnpm verify`                    | Types, lint, formatting, and architecture passed           |
| `pnpm test:unit`                 | 11 tests passed                                            |
| `pnpm test:browser`              | 16 tests passed in Chrome                                  |
| `pnpm build`                     | PWA and Histoire passed                                    |
| `pnpm test:e2e`                  | 13 production journeys passed in desktop and mobile Chrome |

The architecture check also rejects six intentionally forbidden imports and browser-global usages in isolated temporary fixtures.

## What the journeys prove

- Create, edit, search, and reload notes through the running application.
- Reopen the app offline and create another note without a network connection.
- Defer an actual service-worker update and activate it without losing saved notes.
- Keep an unsaved draft when an update is waiting.
- Activate an update in another tab, preserve the original tab's draft, navigate, and update that tab explicitly.
- Restore an actual browser Back/Forward cached page, assert `pageshow.persisted`, and save a note after restoration.
- Pin and delete notes, remember the dark theme, and fit a mobile viewport with touch enabled.

The production test server builds two versions in separate output directories. It provides a separate origin for the browser Back journey. Its controls are test-only and do not enter the application build.

## UI/UX recovery regressions

Additional production journeys prove:

- A real two-tab edit conflict preserves the draft while showing the latest saved version, then saves the draft as a separate note.
- Deletion moves focus to the main landmark, Undo restores the note, and Trash survives a reload before restoration.
- Empty-title validation connects its error through ARIA and focuses the title field.
- Search survives a Settings round trip; Settings reselect scrolls top, and its skip link keeps the route unchanged. Browser Back restores a populated note list to its saved 700-pixel position after asynchronous loading.
- A downloaded JSON backup can be imported as copies without replacing the original.
- A mobile drag-to-dismiss attempt rejected by the unsaved-changes confirmation leaves the draft and sheet position intact. Ctrl+Enter then saves it.

Browser-layer regressions use real IndexedDB for version 1 migration, optimistic concurrency, atomic batch rollback, invalid backup rejection, and additive import. UI browser tests cover removed-opener focus fallback, hash-safe skip links, controlled mobile dismissal, and error-boundary diagnostic privacy. Unit tests cover trash/restore and backup application policy, including rejecting all out-of-range date fields before any write.

The backup UI rejects files larger than 10 MB; the schema rejects more than 5,000 notes or an unsupported envelope version. Export preflights the same limits. Oversized full backups are currently unavailable, with a clear error and no data modification. No bulk test claiming performance at these limits was run.

## Visual inspection

The application was inspected in native Chrome. Histoire was inspected at desktop and mobile sizes, including its dark theme, dialog, and locally served font. The mobile production screenshots below come from the executed Playwright journey.

- [Mobile notes](screenshots/mobile-notes.png)
- [Mobile editor](screenshots/mobile-editor.png)
- [Histoire foundations](screenshots/histoire.png)

These observations prove the inspected layouts. They are not a complete accessibility audit or verification on Safari and Firefox.

## Independent review

Three design proposals and an independent comparison are recorded in [the design review](design/review.md). A separate correctness reviewer reproduced both the cross-tab update and cached-page storage defects in Chrome. The implementation fixed both and added production regressions. A fresh reviewer found no remaining blocker in those changes. Comment review removed two redundant comments. Direct diff review substituted for the unavailable external deslop plugin.

All agents inherited the available parent model. These are independent same-model reviews, not multi-model diversity. No workspace transcript file was supplied; the audit uses current tool observations and repository artifacts.

Histoire's beta build emits warnings about optional upstream setup exports. It builds and its Vue stories run. No cloud synchronization, real operating-system installation prompt, or cross-browser certification is claimed.

## GitHub Pages verification

[The live PWA](https://alexanderop.github.io/my-vue-pwa-starter/) is deployed from application commit `d74ccb3f499fbcf02376c04d02989bb3fc843f74`. [CI and Pages deployment](https://github.com/alexanderop/my-vue-pwa-starter/actions/runs/37578730467) succeeded.

The earlier initial-deployment smoke found that a full commit ID overflowed the mobile Settings row. The fix displays a short commit ID and lets the row wrap. A fresh live Chrome session at 360 × 800 with dark mode then passed saved-note persistence, Settings reload, service-worker scope, manifest start URL, offline reload and writes, and viewport overflow checks. No page errors were observed. The deployment smoke now uses this viewport and checks Settings before returning to Notes.

- [Deployed Settings](screenshots/deployed-settings.png)
- [Deployed offline notes](screenshots/deployed-offline.png)

Reproduce with `node scripts/verify-deployment.mjs https://alexanderop.github.io/my-vue-pwa-starter/`. The smoke uses a disposable browser context. The final evidence commit changes documentation and the verification script only; the tested application build stays deployed. Physical phone installation and Safari remain manual checks.

The recovery revision was independently checked on the published site in a fresh 360 × 800 Chrome context. Conflict review and saving a copy, deleted-opener focus, Undo, downloaded backup import, hash-safe skip navigation, and browser Back restoring exactly 700 pixels all passed. The production smoke also passed offline saving and reopening with no page errors. Updated screenshots above show build `d74ccb3`. A malformed backup timestamp was reproduced locally, fixed before deployment, and verified to leave the notebook unchanged.

## Mobile navigation reference

Build `c87d9f3` replaces the floating mobile navigation with a full-width, icon-only bottom bar. It retains accessible names, active-page semantics, desktop labels, and safe-area padding. [CI and deployment](https://github.com/alexanderop/my-vue-pwa-starter/actions/runs/37579571407) passed. The shared Histoire story and live app were checked at 360 × 800: the bar spans the viewport and both navigation actions work. [Published mobile screenshot](screenshots/mobile-navigation.png).
