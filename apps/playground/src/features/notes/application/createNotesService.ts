import { Result } from '@starter/result'
import {
  BackupFileTooLarge,
  BackupStorageFailed,
  BackupUnreadable,
  backupLimits,
  parseBackup,
  serializeBackup,
  type BackupExportError,
  type BackupFile,
  type BackupImportError,
} from '../domain/backup'
import {
  parseDraft,
  type Note,
  type NoteDraft,
  type NoteError,
  type NoteResult,
} from '../domain/note'
import type { NoteRepository } from '../ports/NoteRepository'

export type NotesService = {
  exportData(): Promise<NoteResult<readonly Note[]>>
  exportBackup(): Promise<
    Result<{ json: string; count: number }, BackupExportError>
  >
  importBackup(file: BackupFile): Promise<Result<number, BackupImportError>>
  listTrash(): Promise<NoteResult<readonly Note[]>>
  trash(note: Note): Promise<NoteResult<Note>>
  restore(note: Note): Promise<NoteResult<Note>>
  list(): Promise<NoteResult<readonly Note[]>>
  create(draft: NoteDraft): Promise<NoteResult<Note>>
  edit(note: Note, draft: NoteDraft): Promise<NoteResult<Note>>
  setPinned(note: Note, pinned: boolean): Promise<NoteResult<Note>>
  remove(note: Note): Promise<NoteResult<void>>
}

const storageError: NoteError = {
  kind: 'storage',
  message: 'Your notes could not be saved or loaded. Please try again.',
}

async function safely<T>(
  operation: () => Promise<NoteResult<T>>,
): Promise<NoteResult<T>> {
  const attempted = await Result.tryPromise({
    try: operation,
    catch: () => storageError,
  })
  return Result.flatten(attempted)
}
async function stored<T>(operation: () => Promise<NoteResult<T>>) {
  return (await safely(operation)).mapError(
    (failure) => new BackupStorageFailed({ failure }),
  )
}

export function createNotesService({
  repository,
  now,
  newId,
}: {
  repository: NoteRepository
  now: () => number
  newId: () => string
}): NotesService {
  const changeTrash = (note: Note, deletedAt: number | undefined) =>
    safely(() => {
      const changed = {
        ...note,
        revision: note.revision + 1,
        updatedAt: Math.max(now(), note.updatedAt),
      }
      if (deletedAt === undefined) delete changed.deletedAt
      else changed.deletedAt = deletedAt
      return repository.save(changed, note.revision)
    })
  return {
    exportData: () => safely(() => repository.list()),
    listTrash: () =>
      safely(async () =>
        (await repository.list()).map((notes) =>
          notes.filter((note) => note.deletedAt !== undefined),
        ),
      ),
    trash: (note) => changeTrash(note, now()),
    restore: (note) => changeTrash(note, undefined),
    exportBackup: () =>
      Result.gen(async function* () {
        const notes = yield* Result.await(stored(() => repository.list()))
        const json = yield* serializeBackup(notes)
        return Result.ok({ json, count: notes.length })
      }),
    importBackup: (file) =>
      Result.gen(async function* () {
        if (file.size > backupLimits.bytes)
          return yield* new BackupFileTooLarge({ bytes: file.size })
        const text = yield* Result.await(
          Result.tryPromise({
            try: () => file.text(),
            catch: () => new BackupUnreadable(),
          }),
        )
        const notes = yield* parseBackup(text)
        const imported = notes.map((note) => ({
          ...note,
          id: newId(),
          revision: 1,
        }))
        yield* Result.await(stored(() => repository.addMany(imported)))
        return Result.ok(imported.length)
      }),
    list: () =>
      safely(async () =>
        (await repository.list()).map((notes) =>
          notes
            .filter((note) => note.deletedAt === undefined)
            .toSorted(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) ||
                b.updatedAt - a.updatedAt ||
                a.id.localeCompare(b.id),
            ),
        ),
      ),
    create: (draft) =>
      safely(() =>
        Result.gen(async function* () {
          const parsed = yield* parseDraft(draft)
          const timestamp = now()
          return repository.save(
            {
              ...parsed,
              id: newId(),
              pinned: false,
              createdAt: timestamp,
              updatedAt: timestamp,
              revision: 1,
            },
            null,
          )
        }),
      ),
    edit: (note, draft) =>
      safely(() =>
        Result.gen(async function* () {
          const parsed = yield* parseDraft(draft)
          return repository.save(
            {
              ...note,
              ...parsed,
              updatedAt: Math.max(now(), note.updatedAt),
              revision: note.revision + 1,
            },
            note.revision,
          )
        }),
      ),
    setPinned: (note, pinned) =>
      safely(() =>
        repository.save(
          {
            ...note,
            pinned,
            updatedAt: Math.max(now(), note.updatedAt),
            revision: note.revision + 1,
          },
          note.revision,
        ),
      ),
    remove: (note) => safely(() => repository.remove(note.id, note.revision)),
  }
}
