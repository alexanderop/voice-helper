# Candidate 3: owned feature runtimes

## Problem

A reusable Vue PWA starter needs visibly independent features and a reusable UI library, while native IndexedDB, service-worker updates, and Vue subscriptions require explicit lifetime management. Greenfield grounding is skipped. This design makes each feature a factory-created runtime: one owner connects its dependencies, exposes its UI capability, and disposes its resources. No global stores, service locator, backend, Dexie, or Effect.

## Usage (caller's view)

Composition creates resources once. Vue receives an already-connected feature capability rather than discovering storage implicitly.

```ts
// app/bootstrap.ts
const database = await openDatabase({ name: 'starter', version: 1 })
const notes = createNotesFeature({
  repository: createIndexedDbNotesRepository(database),
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
})
const pwa = createPwaRuntime({ register: registerSW })
const app = createApp(App, { notes, pwa })
app.mount('#app')
const dispose = () => {
  app.unmount()
  notes.dispose()
  pwa.dispose()
  database.close()
}
import.meta.hot?.dispose(dispose)
```

```ts
// features/notes/ui/NotesPage.vue -- capability supplied by route composition
const props = defineProps<{ notes: NotesFeature }>()
const view = useNotesView(props.notes) // subscription cleaned by Vue scope
const editor = ref<NoteDraft>({ title: '', body: '' })
const result = await props.notes.save({ kind: 'create', draft: editor.value })
if (result.ok)
  closeEditor() // only after transaction commits
else showEditorError(result.error)
```

```ts
// app/App.vue -- unsaved draft stays visible until user chooses update
const state = usePwaView(props.pwa)
async function applyUpdate() {
  if (props.notes.snapshot().pendingWrites > 0) return
  // UI resolves an unsaved editor draft before calling this handler.
  await props.pwa.activateUpdate()
}
```

## Shape

```ts
type NoteId = string & { readonly __noteId: unique symbol }
type Note = Readonly<{
  id: NoteId
  title: string
  body: string
  pinned: boolean
  createdAt: string
  updatedAt: string
  revision: number
}>
type NoteDraft = Readonly<{ title: string; body: string }>
type SaveNote =
  | { kind: 'create'; draft: NoteDraft }
  | { kind: 'edit'; id: NoteId; expectedRevision: number; draft: NoteDraft }
type NoteError =
  | { kind: 'validation'; message: string }
  | { kind: 'conflict'; message: string }
  | { kind: 'storage'; message: string }
type Result<T> = { ok: true; value: T } | { ok: false; error: NoteError }
type NotesSnapshot = Readonly<{
  notes: readonly Note[]
  loading: boolean
  pendingWrites: number
  error: NoteError | null
}>
interface NotesFeature {
  snapshot(): NotesSnapshot
  subscribe(listener: (next: NotesSnapshot) => void): () => void
  refresh(): Promise<void>
  save(input: SaveNote): Promise<Result<Note>>
  remove(id: NoteId, expectedRevision: number): Promise<Result<void>>
  setPinned(
    id: NoteId,
    pinned: boolean,
    expectedRevision: number,
  ): Promise<Result<Note>>
  dispose(): void
}
interface NoteRepository {
  readAll(): Promise<readonly Note[]>
  // Adapter compares expectedRevision and writes in the SAME transaction.
  commit(change: NoteChange): Promise<Result<Note | undefined>>
}
type NoteChange =
  | { kind: 'put'; note: Note; expectedRevision: number | null }
  | { kind: 'remove'; id: NoteId; expectedRevision: number }
interface NotesDependencies {
  repository: NoteRepository
  now(): string
  newId(): string
}
function createNotesFeature(deps: NotesDependencies): NotesFeature {
  throw new Error('not implemented')
}
interface PwaRuntime {
  snapshot(): Readonly<{ offlineReady: boolean; updateAvailable: boolean }>
  subscribe(listener: () => void): () => void
  activateUpdate(): Promise<void>
  dispose(): void
}
```

The factory owns its current immutable snapshot, subscriptions, initialization, refresh generations, and mutation policy. The Vue adapter owns only translating snapshots into readonly shallow refs. This concentrates lifecycle complexity behind a single capability, per interface-depth, while keeping framework imports out of application code.

Pure domain functions normalize titles, validate lengths, advance revisions, and derive ordering. Valibot schemas validate user input and stored records at entry points; the adapter exports only domain values, per boundary-discipline. ID generation is parsed once into a branded ID. A revision is a positive integer validated at storage ingress. Search and pinned ordering derive from the snapshot; no second persisted index or synchronized filtered list.

```text
apps/playground/src/
  app/{bootstrap.ts,App.vue,router.ts}       # Composition and application lifetime
  features/notes/
    domain/{note.ts,note.schema.ts}         # Invariants and pure transformations
    application/createNotesFeature.ts      # State transitions and feature lifetime
    ports/NoteRepository.ts                # Domain persistence capability
    adapters/indexeddbNotesRepository.ts   # Schema boundary and atomic commit
    ui/{NotesPage.vue,NoteEditor.vue,useNotesView.ts}
    index.ts                               # Public factory/types/page export
  platform/
    indexeddb/database.ts                  # Open, migration, close, blocked state
    pwa/{createPwaRuntime.ts,usePwaView.ts}  # SW/install browser integration
  features/settings/ui/SettingsPage.vue
packages/ui/src/
  styles/{tokens.css,themes.css}
  components/*/{Ui*.vue,Ui*.story.vue}
  patterns/{AppShell.vue,AppNavigation.vue}
  index.ts
packages/ui/histoire.config.ts
```

Import gates permit app → feature public APIs and platform; notes adapters → own ports/domain; application → own ports/domain; UI → application public types/domain and @starter/ui. Domain cannot import Vue, browser APIs, adapters, or app. Platform never imports feature UI. UI package cannot import app or feature code. The factory is not a generic plugin registry; it is a concrete notes capability.

### Lifecycle, errors, and concurrency

- App composition owns the IDB connection; feature disposal cancels publication and clears subscribers, never closes a shared connection. HMR performs the same cleanup as explicit teardown.
- Factory starts one read. `subscribe` immediately supplies current snapshot. Reads carry generations so a stale read cannot replace a newer committed snapshot; dispose invalidates all generations.
- Writes await `transaction.oncomplete`; request success alone never means saved. Abort/quota/invalid data produce actionable errors and preserve editor contents.
- Creating allocates ID/time once per submitted operation. UI prevents repeated submission during a pending write. Edits and deletes use expected revision; simultaneous tabs cannot silently overwrite one another because comparison and write share a readwrite transaction.
- Each editor owns its draft. Concurrent editor operations get explicit conflicts; never synchronize partially typed drafts. No global serial queue or optimistic rollback is needed.
- Changes trigger a full refresh after successful commit; for the bounded demo this is simpler than maintaining duplicate indexes. On window focus refresh from disk to discover other tabs.
- Invalid stored data does not silently disappear or overwrite itself. Expose recoverable load failure with reset/export recovery left explicit for implementation scope.
- IndexedDB `versionchange` closes the connection and presents reload guidance; blocked upgrades surface an actionable message. App bootstrap renders an error/retry state if opening fails.
- SW uses generated caching and prompt registration. Explicit user update waits for persisted writes and resolves unsaved drafts. Cache readiness and network connectivity remain separate UI concepts.

## Synthesis decision

Pending orchestrator comparison. The distinguishing choice is a framework-free feature runtime owning state and disposal, rather than a collection of stateless use cases orchestrated by a Vue store.

## Tradeoffs accepted

- We accept a small subscription protocol in exchange for lifecycle ownership independent of Vue and directly testable transitions.
- We accept full-list reads and derived search in exchange for a comprehensible notes demo with no redundant indexes.
- We accept revision conflicts across editors/tabs in exchange for preserving user edits without a merge engine.
- We accept explicit composition props in exchange for dependencies visible at every feature entry point.

## Alternatives considered

- Stateless use cases plus a Vue composable store: fewer subscription lines, but loading generations, persistence completion, and teardown become Vue-specific policy spread across callers; rejected because this candidate prioritizes one feature lifecycle owner.
- Application-wide reactive service container: centralizes discovery but exposes string/key coupling and hides lifetime; rejected because callers cannot see dependencies from function signatures.
- Generic feature plugin registry with start/stop hooks: hides registration plumbing but enlarges every feature's API and imposes unnecessary infrastructure on the starter.

## Open questions and risks

- Can the subscription protocol remain smaller than the equivalent Vue-owned orchestration as implementation proceeds? If not, flatten it into a feature composable while preserving explicit dependency injection.
- Should an unsupported IndexedDB browser show a blocking recovery screen or an explicitly ephemeral mode? Default is blocking recovery to avoid misleading persistence promises.

## Next implementation step

Implement the domain schema and atomic IndexedDB repository with real-browser conflict/transaction tests, then connect one notes feature runtime to the UI library's editor in the playground.
