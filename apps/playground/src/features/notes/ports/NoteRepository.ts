import type { Note, NoteResult } from '../domain/note'

export type NoteRepository = {
  addMany(notes: readonly Note[]): Promise<NoteResult<void>>
  list(): Promise<NoteResult<readonly Note[]>>
  save(note: Note, expectedRevision: number | null): Promise<NoteResult<Note>>
  remove(id: string, expectedRevision: number): Promise<NoteResult<void>>
}
