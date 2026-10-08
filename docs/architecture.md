# Architecture

The app composes concrete capabilities. Features own their domain rules, application services, outbound ports, adapters, and Vue UI. The UI workspace has no application dependencies.

## Design decision

Three independent design sketches compared a focused feature service, a command/snapshot session, and a feature runtime. An independent same-model judge scored them 24, 18, and 18 out of 25 for simplicity, ownership, durability, UI reuse, and implementability. The focused service is the base. Vue already owns reactive UI state, so a second subscription system adds no useful capability here.

The design adopts explicit cleanup and update guards from the runtime candidate. Writes must commit before success is reported. Revision checks reject stale edits. In-flight reads are invalidated when a mutation begins. Refresh failure after a committed write is a separate UI concern.

The notes feature owns its database adapter because no second feature needs a shared transaction. A shared database layer can be extracted when that requirement exists. No generic repository, DI container, or event bus is included.

## Ownership

- `app` constructs adapters, injects dependencies, and owns routing and browser lifecycle.
- `features/notes/domain` owns validated note data and pure rules.
- `features/notes/application` owns user actions and receives storage, clock, and ID capabilities.
- `features/notes/ports` declares persistence contracts.
- `features/notes/adapters` implements those contracts with native IndexedDB and validates stored rows.
- `features/notes/ui` owns reactive view state and calls supplied application capabilities.
- `platform/pwa` owns service-worker registration, installation, and update readiness.
- `packages/ui` owns reusable presentation, semantic styles, accessible interactions, and Histoire stories.
- `packages/result` owns the `Result` type that domain, ports, application, and adapters return for expected failures.
- `packages/composables` owns small Vue composables for browser events, media queries, connectivity, visibility, and validated `localStorage`. It depends only on Vue, Valibot, and `@starter/result`; features may import it, but `packages/ui`, domain, application, and ports may not.

`pnpm check:architecture` enforces import directions. Pure code imports only Valibot and `@starter/result` outside its feature, and does not use browser globals or Vue. UI components do not discover databases or feature adapters.

## Verification

Node tests cover domain rules and application outcomes with explicit deterministic dependencies. Browser tests exercise real IndexedDB and Vue interaction. Playwright drives the production application, offline reopening, and a real service-worker upgrade. Histoire provides interactive examples and visual review; it is not the automated test runner.

## Recovery and portability

Notes use IndexedDB schema version 2. Existing version 1 rows remain valid: `deletedAt` is optional, so upgrading does not rewrite or remove saved notes. An old connection receives `versionchange` and closes; older clients cannot reopen version 1 and silently remove trash metadata. Revision checks remain atomic within each write transaction.

Normal deletion moves a note to Trash. Undo and Restore create another revision; permanent deletion requires explicit confirmation. Conflicting edits keep the local draft. Users can save a new copy, inspect the latest stored note, or explicitly replace that inspected revision. A second concurrent change still rejects replacement.

Settings receives the notes service through app composition. Backups include active and trashed notes. The versioned JSON envelope is validated with Valibot before any write. Import assigns fresh IDs and commits the entire batch in one transaction; it never replaces existing notes. Re-importing a backup intentionally creates more copies. Both import and export support up to 5,000 notes and a 10 MB file. Export checks these limits before starting a download; an oversized notebook remains untouched and reports that its full backup cannot be produced. There is no partial or automatic replacement import.

Search state is a Vue ref keyed by the injected notes service, so route round trips retain the query without persisting UI state in the database. Normal navigation starts at the top; reselecting the active navigation item also scrolls to the top. Browser history uses its saved scroll position after the asynchronous content grows to the required height. A bounded wait allows clamping when content was removed; newer navigations cancel stale restoration. Skip links focus the main landmark without changing the hash route.

Shared dialogs restore focus to a main-landmark fallback if the original control was removed. Their mobile drag handle requests closure through the same controlled open event as Escape and Close; the feature still decides whether pending writes or an unsaved draft prevent dismissal. Validation messages belong to their fields, focus the first invalid input, and use theme contrast tokens.

The root Vue error boundary replaces a failed interface with reload recovery. Its copyable diagnostics contain only the application name, build version, and a generic failure label. It does not capture exception messages or note contents. Saved data is retained, but recovery cannot promise to preserve an unsaved draft after an unexpected interface failure.
