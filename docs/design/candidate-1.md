# Feature-owned repository and focused application service

## Problem

Build a reusable Vue PWA starter whose notes feature demonstrates durable local data, explicit dependencies, and feature ownership without turning a small application into a framework. The public UI package must also work outside this application. This is greenfield, so no existing integration constrains ownership. Planning checklist: grounding skipped for greenfield; sketch completed here; synthesis and implementation belong to the orchestrator; redesign if implementation exposes repeated boundary friction.

## Usage (caller's view)

```ts
// app/bootstrap.ts — sole composition root
const repository = createIndexedDbNotes({ indexedDB: window.indexedDB })
const notes = createNotesService({
  repository,
  now: () => Date.now(),
  newId: () => crypto.randomUUID(),
})
app.provide(notesKey, notes)
```

```ts
// features/notes/ui/useNotes.ts — UI orchestration
const result = await notes.create({ title: draft.title, body: draft.body })
if (result.ok) {
  draft.reset()
  await refresh()
} else {
  message.value = describeNotesError(result.error)
}
```

```vue
<!-- Feature view and Histoire both consume the same UI exports. -->
<UiSheet v-model:open="editing" title="Edit note">
  <UiInput v-model="draft.title" label="Title" />
  <UiButton :loading="saving" @click="save">Save note</UiButton>
</UiSheet>
```

## Shape

```ts
type NoteId = string & { readonly __brand: 'NoteId' }
type Revision = number & { readonly __brand: 'Revision' }
type Note = Readonly<{
  id: NoteId
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  revision: Revision
}>
type NoteDraft = Readonly<{ title: string; body: string }>
type Outcome<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }
type StorageError =
  | { kind: 'unavailable' | 'quota' | 'corrupt' | 'blocked' }
  | { kind: 'conflict'; latest: Note | null }
type NotesError = StorageError | { kind: 'invalid'; message: string }

// Feature-owned outbound port: atomic conditions belong to persistence.
interface NoteRepository {
  list(): Promise<Outcome<readonly Note[], StorageError>>
  insert(note: Note): Promise<Outcome<Note, StorageError>>
  replace(note: Note, expected: Revision): Promise<Outcome<Note, StorageError>>
  remove(id: NoteId, expected: Revision): Promise<Outcome<void, StorageError>>
}
interface NotesService {
  list(): Promise<Outcome<readonly Note[], NotesError>>
  create(input: unknown): Promise<Outcome<Note, NotesError>>
  edit(note: Note, input: unknown): Promise<Outcome<Note, NotesError>>
  setPinned(note: Note, pinned: boolean): Promise<Outcome<Note, NotesError>>
  remove(note: Note): Promise<Outcome<void, NotesError>>
}
function createNotesService(deps: {
  repository: NoteRepository
  now(): number
  newId(): string
}): NotesService {
  throw new Error('not implemented')
}
function createIndexedDbNotes(deps: { indexedDB: IDBFactory }): NoteRepository {
  throw new Error('not implemented')
}
// Pure domain functions validate drafts, construct new records, and derive edits.
// The service applies time/id policy, domain operations, and storage conditions.
// UI owns list filtering and presentation state; those do not mutate records.
```

The service is a capability surface for complete user actions. Its depth comes from validation, immutable record construction, clock/id policy, revision handling, and error normalization. It deliberately avoids one module per use case: a caller traces view/composable → service → adapter. `list` is the one thin read path; keep it on this cohesive feature capability so callers never acquire the outbound port just to read.

Each IndexedDB mutation reads its current record and validates the expected revision inside the same readwrite transaction. Compare-and-replace prevents silent lost updates between tabs. Independent note ids isolate ordinary edits; concurrent edits to the same note return a conflict and preserve the draft. Delete of an already absent record succeeds, while an intervening edit rejects deletion. `setPinned` accepts the desired state rather than a toggle, making retries safe when the original value already matches.

Valibot parses unknown draft input at the feature entry boundary and stored rows inside the adapter, per boundary-discipline. Stored schemas remain private; domain types are the port vocabulary. A corrupt row yields an explicit recoverable error rather than silently disappearing. Empty bodies are allowed; trim titles and require nonempty titles with a bounded length. Domain constructors own these rules once. Search and pinned-first/date ordering derive from the current read snapshot rather than a synchronized secondary store.

```text
apps/playground/src/
  app/{bootstrap,router,App}.ts|vue
  features/notes/
    domain.ts                 # Model, validation, pure changes, sorting
    service.ts                # Action semantics and explicit dependency contract
    ports.ts                  # Repository and storage failures
    adapters/indexedDb.ts     # DB opening, row schemas, transactions, revisions
    ui/{NotesPage,NoteEditor,NoteCard}.vue
    ui/{context,useNotes}.ts
    index.ts                  # Public feature API; adapter factory for root
  features/settings/ui/SettingsPage.vue
  platform/pwa/{register,usePwa}.ts
  platform/theme.ts
packages/ui/src/
  styles/{tokens,base}.css
  components/<name>/{UiName.vue,UiName.story.vue}
  patterns/{AppShell,AppNavigation}.vue
  index.ts
```

Distinct structural choice: the notes feature owns its entire database adapter, including opening and migration. There is no shared platform storage framework until another feature actually needs a shared transaction or database. The architecture gate allows app composition to construct feature adapters through their public index while blocking cross-feature internals, Vue/browser imports in domain/service, and all app imports from the UI package.

The UI package owns semantic color/spacing/radius tokens, light/dark styling, focus states, form labeling, responsive dialog/sheet, and navigation layout. Simple controls use HTML; dialogs use Reka. Histoire colocates real component examples for states and viewport sizes. App-specific note cards remain in the notes feature.

### Lifecycle and failure behavior

- Cache the database-opening promise inside each adapter; clear it after failed opens. Handle blocked upgrades with a surfaced state. Close on `versionchange`, and invalidate the cached handle so later operations reopen safely.
- Resolve writes only after transaction completion; reject on abort/error. Do not await unrelated asynchronous work while a transaction is active. Map quota/security/availability failures to stable feature errors and retain editor contents.
- Refresh on activation/focus and after successful commands. Protect refresh requests with a generation counter so older reads cannot overwrite newer results. Disable duplicate submission per editor; never clear a draft before a committed write.
- Register a generated service worker with prompt-based updates. Keep offline readiness separate from online status. Update reload is an explicit action, postponed while an editor is dirty; saved data remains in IndexedDB.
- Treat install support as browser capability. Show supported install action or platform-specific guidance, and never infer installability from user agent alone.
- Theme state is a presentation preference with system/light/dark options, persisted using small guarded localStorage reads and writes.

Tests target pure domain validation/order/time, real IndexedDB commit/reopen/conflict/schema handling in Vitest Browser Mode, accessible editor interactions with vitest-browser-vue, and production offline plus two-build service-worker upgrade journeys in Playwright Chrome. CI runs typecheck, lint, formatting, import boundaries, tests, Histoire build, and application build.

## Synthesis decision

For the orchestrator to fill after comparing independent candidates.

## Tradeoffs accepted

- We accept a feature-local database in exchange for complete ownership and no speculative storage framework.
- We accept explicit conflict UI instead of automatic text merging in exchange for predictable data protection and a small persistence contract.
- We accept loading all notes for a small starter dataset in exchange for simple derived search/order without database indexes and duplicate query semantics.

## Alternatives considered

- Generic storage platform with CRUD repositories: hides database setup but exposes record serialization and migration coordination across features; the broad generic interface provides less useful domain capability.
- Reactive store as the feature boundary: simplifies Vue binding but couples domain operation semantics and asynchronous failures to framework state; callers must understand pending/error lifecycle to complete commands.
- Event-sourced notes: provides merge history but adds replay, schema evolution, and compaction concerns beyond this starter's simple local actions.

## Open questions and risks

Could future features require atomic writes with notes? If that concrete need arrives, move the shared database lifecycle into platform while retaining feature-owned record schemas. Can the browser upgrade harness reliably run two production builds on one origin? Prove that early, before counting update coverage as complete. Neither question blocks the initial implementation.

## Next implementation step

Build the pure notes model and real IndexedDB adapter with conflict/commit tests, then wire the first create-and-reopen vertical slice through the shared UI package.
