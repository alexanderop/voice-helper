import { Result, TaggedError } from '@starter/result'
import * as v from 'valibot'
import { noteSchema, type Note, type NoteError } from './note'

export const backupLimits = { notes: 5_000, bytes: 10 * 1024 * 1024 } as const

/** A file the user picked. The browser `File` satisfies this shape. */
export type BackupFile = Readonly<{ size: number; text(): Promise<string> }>

export class BackupFileTooLarge extends TaggedError('BackupFileTooLarge')<{
  bytes: number
}> {}
export class BackupUnreadable extends TaggedError('BackupUnreadable') {}
export class InvalidBackup extends TaggedError('InvalidBackup') {}
export class CollectionTooLarge extends TaggedError('CollectionTooLarge')<{
  notes: number
  bytes: number
}> {}
export class BackupStorageFailed extends TaggedError('BackupStorageFailed')<{
  failure: NoteError
}> {}

export type BackupImportError =
  BackupFileTooLarge | BackupUnreadable | InvalidBackup | BackupStorageFailed
export type BackupExportError = CollectionTooLarge | BackupStorageFailed

const backupSchema = v.object({
  format: v.literal('fieldnotes'),
  version: v.literal(1),
  notes: v.pipe(v.array(noteSchema), v.maxLength(backupLimits.notes)),
})

export function serializeBackup(
  notes: readonly Note[],
): Result<string, CollectionTooLarge> {
  const json = JSON.stringify(
    { format: 'fieldnotes', version: 1, notes },
    null,
    2,
  )
  const bytes = new TextEncoder().encode(json).byteLength
  return notes.length > backupLimits.notes || bytes > backupLimits.bytes
    ? Result.err(new CollectionTooLarge({ notes: notes.length, bytes }))
    : Result.ok(json)
}

export function parseBackup(
  text: string,
): Result<readonly Note[], BackupUnreadable | InvalidBackup> {
  return Result.try({
    try: (): unknown => JSON.parse(text),
    catch: () => new BackupUnreadable(),
  }).andThen((json) => {
    const parsed = v.safeParse(backupSchema, json)
    return parsed.success
      ? Result.ok(parsed.output.notes)
      : Result.err(new InvalidBackup())
  })
}
