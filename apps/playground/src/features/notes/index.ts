export {
  createNotesService,
  type NotesService,
} from './application/createNotesService'
export { createIndexedDbNotes } from './adapters/indexeddb/createIndexedDbNotes'
export type { Note } from './domain/note'
export type { BackupExportError, BackupImportError } from './domain/backup'
