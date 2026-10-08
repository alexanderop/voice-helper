# Candidate 2: feature sessions with commands and immutable snapshots

## Problem

Build a lean Vue PWA starter that demonstrates feature ownership, explicit capabilities, durable offline writes, and an independent UI library. Greenfield means no existing architecture requires migration. A generic CRUD service tends to leave the Vue caller coordinating loading, refreshes, pending state, error mapping, and stale edits. This candidate gives one feature session responsibility for those decisions while keeping domain rules framework-free.

## Usage (caller's view)

The app composition root constructs the storage adapter and feature session. Routes receive that session through a typed Vue injection key; no module singleton reaches into browser globals.

```ts
// app/bootstrap.ts
const notes = createNotesSession({
  store: createIndexedDbNotesStore(database),
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
})
app.provide(notesKey, notes)
```

```ts
// features/notes/ui/NotesPage.vue
const notes = useNotesSession() // Vue adapter owns subscription cleanup
const search = ref('')
const visible = computed(() => selectNotes(notes.snapshot.value, search.value))
onMounted(() => notes.refresh())
// Explicit set-state command is safe to repeat; no ambiguous toggle.
await notes.execute({ type: 'setPinned', id: note.id, pinned: true })
```

```ts
// features/notes/ui/NoteEditor.vue
const result = await notes.execute({
  type: 'save',
  note: { id: draft.id, title: draft.title, body: draft.body },
  expectedRevision: draft.revision,
})
if (result.ok) closeEditor()
// On failure keep the draft and render result.error; never pretend it saved.
```

## Shape

```ts
type Note = Readonly<{
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  revision: number
}>
type NoteDraft = Readonly<{ id?: string; title: string; body: string }>
type NotesError =
  | { kind: 'invalid-input'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'storage'; message: string }
  | { kind: 'corrupt-data'; message: string }
type Result<T> = { ok: true; value: T } | { ok: false; error: NotesError }
type Command =
  | { type: 'save'; note: NoteDraft; expectedRevision?: number }
  | { type: 'delete'; id: string; expectedRevision: number }
  | { type: 'setPinned'; id: string; pinned: boolean }
type Snapshot =
  | { status: 'loading'; notes: readonly Note[]; pending: readonly string[] }
  | { status: 'ready'; notes: readonly Note[]; pending: readonly string[] }
  | {
      status: 'error'
      notes: readonly Note[]
      pending: readonly string[]
      error: NotesError
    }
interface NotesSession {
  getSnapshot(): Snapshot
  subscribe(listener: (snapshot: Snapshot) => void): () => void
  refresh(): Promise<void>
  execute(command: Command): Promise<Result<void>>
}
interface NotesStore {
  readAll(): Promise<Result<readonly Note[]>>
  // Atomic read/compare/write; synchronous change callback, no awaits inside transaction.
  change(
    id: string,
    update: (current: Note | undefined) => Result<Note | undefined>,
  ): Promise<Result<void>>
}
interface NotesDependencies {
  store: NotesStore
  now(): string
  newId(): string
}
declare function createNotesSession(deps: NotesDependencies): NotesSession
declare function selectNotes(
  snapshot: Snapshot,
  search: string,
): readonly Note[]
```

The session's four-method interface hides durable completion, pending state, conflict handling, refresh ordering, and error conversion. Callers only send an intent and observe a snapshot. Storage wire schemas remain private to the adapter, per boundary-discipline. The adapter parses stored records with Valibot; invalid records produce a visible error rather than silent deletion. The application parses editor input once and delegates pure rules to domain functions.

`NotesStore.change` intentionally differs from the command API: it is an atomic persistence capability, not a CRUD mirror. It holds a single-record read/write transaction while calling a synchronous pure transformation. Business rules remain in the feature; IndexedDB transaction mechanics remain in the adapter. The callback never performs I/O. `undefined` means deletion, including an already missing record, making delete idempotent.

```text
apps/playground/src/
  app/{bootstrap,router,App}.ts|vue          composition and navigation
  features/notes/
    domain/note.ts                         pure validation/edit/pin rules
    application/notes-session.ts           commands, snapshots, refresh ordering
    ports/notes-store.ts                   atomic store capability
    adapters/indexeddb-notes-store.ts      schema parsing and durable transactions
    ui/{NotesPage,NoteEditor}.vue
    ui/use-notes-session.ts                Vue subscription bridge
    index.ts                              public feature construction and route
  features/settings/ui/SettingsPage.vue
  platform/indexeddb/database.ts           opening, versioning, blocked upgrades
  platform/pwa/pwa-controller.ts           registration, install/update/offline state
packages/ui/src/
  styles/{tokens,theme}.css
  components/*/{UiComponent,UiComponent.story}.vue
  patterns/*                              app shell, navigation, responsive overlay
  index.ts
```

### Lifecycle, errors, and concurrency

- Create one session per mounted app. The Vue bridge subscribes on setup and unsubscribes on disposal; the database lifecycle belongs to the app.
- Keep separate editor drafts; persist only on explicit save. UI pending state prevents duplicate create submissions. Drafts survive failed saves and update notices never reload without user action.
- Execute unrelated note writes concurrently. Same-note edits use revision comparison within the real read/write transaction. Pin changes update only the pin field of the latest stored record, preserving text. Stale text save/delete returns a conflict instead of overwriting another tab's changes.
- Publish updated snapshots only after transaction `complete`, never after an individual request's success. Abort/error returns storage failure and preserves the last confirmed snapshot.
- Refresh has a monotonically increasing generation so older reads cannot replace newer reads. After a committed mutation schedule a fresh read; external tab changes become visible on focus/visibility refresh. No event bus or synchronization dependency is necessary.
- Migration/open handles `blocked` and `versionchange`: show a useful close-other-tabs/reload message and close stale database connections. Keep current v1 migration deliberately small.
- Service worker caches application assets, never the note database. Use prompt registration, locally saved draft tracking, install capability detection, and generated Workbox caching. Theme preference is a tiny independent browser adapter.

## Synthesis decision

Pending parent comparison. Distinguishing choice: observable command session owns feature lifecycle rather than exposing a collection of independent CRUD use cases to Vue.

## Tradeoffs accepted

- We accept a small subscription mechanism in exchange for framework-free application behavior and one authoritative loading/error/pending state.
- We accept a synchronous atomic-transform storage port in exchange for preserving cross-tab edits without introducing locks or an event log.
- We accept whole-collection reads and in-memory search in exchange for a transparent example suitable for a small local notes collection.
- We accept refresh-on-focus cross-tab visibility in exchange for no BroadcastChannel lifecycle or second synchronization protocol.

## Alternatives considered

- Separate CRUD use cases: easier functions, but Vue must coordinate refresh and durable operation state; hides less complexity behind a larger call surface.
- Persisted event log with projection: naturally resolves independent writers but exposes event identity, projection migrations, compaction, and ordering beyond starter needs.
- Vue-only repository composable: very compact, but mixes application decisions with framework lifecycle and weakens the ports/adapters example.

## Open questions and risks

- Can the atomic synchronous-transform port remain readable to newcomers? Document its transaction restriction beside its signature and prove it using real IndexedDB tests.
- Will the session's pending/error state become more complex than the notes feature merits? Keep state derivable and avoid generic stores, middleware, or command registries.

## Next implementation step

Implement the atomic IndexedDB adapter and two-tab stale-edit/transaction-abort browser tests, then build the notes session against that proven capability.
