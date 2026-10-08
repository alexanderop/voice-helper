import { Result } from '@starter/result'
import * as fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { createNotesService, type NotesService } from './createNotesService'
import type { Note } from '../domain/note'
import type { NoteRepository } from '../ports/NoteRepository'

function fixture(idPrefix = 'note') {
  const rows = new Map<string, Note>()
  const repository: NoteRepository = {
    async addMany(notes) {
      for (const note of notes) rows.set(note.id, note)
      return Result.ok(undefined)
    },
    async list() {
      return Result.ok([...rows.values()])
    },
    async save(note) {
      rows.set(note.id, note)
      return Result.ok(note)
    },
    async remove(id) {
      rows.delete(id)
      return Result.ok(undefined)
    },
  }
  let id = 0
  let time = 100
  const service = createNotesService({
    repository,
    now: () => time++,
    newId: () => `${idPrefix}-${++id}`,
  })
  return { service, repository }
}

function value<T>(result: Result<T, { message: string }>): T {
  if (result.isErr()) throw new Error(result.error.message)
  return result.value
}

function file(contents: unknown) {
  const text = JSON.stringify(contents)
  return {
    size: new TextEncoder().encode(text).byteLength,
    text: async () => text,
  }
}

type Entry = Readonly<{
  title: string
  body?: string
  pinned?: boolean
  trashed: boolean
}>

async function seed(service: NotesService, entries: readonly Entry[]) {
  for (const { title, body = '', pinned = false, trashed } of entries) {
    const created = value(await service.create({ title, body }))
    const kept = pinned
      ? value(await service.setPinned(created, true))
      : created
    if (trashed) value(await service.trash(kept))
  }
}

const pinnedThenNewest = (a: Note, b: Note) =>
  Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt

function tagOf(result: Result<unknown, { _tag: string }>) {
  return result.isErr() ? result.error._tag : 'ok'
}

describe('notes service', () => {
  it('normalizes titles, preserves body whitespace, and uses supplied identity and time', async () => {
    const { service } = fixture()
    expect(
      value(
        await service.create({
          title: '  First idea  ',
          body: '  keep indentation\n',
        }),
      ),
    ).toEqual({
      id: 'note-1',
      title: 'First idea',
      body: '  keep indentation\n',
      pinned: false,
      createdAt: 100,
      updatedAt: 100,
      revision: 1,
    })
  })

  it('rejects blank or oversized drafts without storing them', async () => {
    const { service } = fixture()
    for (const draft of [
      { title: '  ', body: '' },
      { title: 'x'.repeat(121), body: '' },
      { title: 'Valid', body: 'x'.repeat(20_001) },
    ]) {
      expect(await service.create(draft)).toMatchObject({
        status: 'error',
        error: { kind: 'validation' },
      })
    }
    expect(await service.list()).toEqual({ status: 'ok', value: [] })
  })

  it('increments revisions while preserving identity and creation time', async () => {
    const { service } = fixture()
    const created = value(
      await service.create({ title: 'First', body: 'Draft' }),
    )
    const edited = value(
      await service.edit(created, { title: 'Updated', body: 'Ready' }),
    )
    expect(edited).toEqual({
      ...created,
      title: 'Updated',
      body: 'Ready',
      revision: 2,
      updatedAt: 101,
    })
    expect(value(await service.setPinned(edited, true))).toEqual({
      ...edited,
      pinned: true,
      revision: 3,
      updatedAt: 102,
    })
  })

  it('lists pinned notes first and the rest by most recent change, and removes notes', async () => {
    const { service } = fixture()
    const first = value(await service.create({ title: 'First', body: '' }))
    const second = value(await service.create({ title: 'Second', body: '' }))
    const pinned = value(await service.setPinned(first, true))
    const third = value(await service.create({ title: 'Third', body: '' }))
    expect(value(await service.list())).toEqual([pinned, third, second])
    expect(await service.remove(third)).toEqual({
      status: 'ok',
      value: undefined,
    })
    expect(value(await service.list())).toEqual([pinned, second])
  })

  it('returns storage failures without rejecting and preserves typed conflicts', async () => {
    const { repository } = fixture()
    const broken = createNotesService({
      repository: {
        ...repository,
        list: () => Promise.reject(new Error('disk unavailable')),
      },
      now: () => 0,
      newId: () => 'id',
    })
    expect(await broken.list()).toMatchObject({
      status: 'error',
      error: { kind: 'storage' },
    })
    const conflicted = createNotesService({
      repository: {
        ...repository,
        save: async () =>
          Result.err({ kind: 'conflict', message: 'Changed elsewhere' }),
      },
      now: () => 0,
      newId: () => 'id',
    })
    expect(await conflicted.create({ title: 'Title', body: '' })).toEqual({
      status: 'error',
      error: { kind: 'conflict', message: 'Changed elsewhere' },
    })
  })

  it('keeps trashed notes recoverable and exports them', async () => {
    const { service } = fixture()
    const original = value(
      await service.create({ title: 'Keep me', body: 'Draft' }),
    )
    const deleted = value(await service.trash(original))
    expect(value(await service.list())).toEqual([])
    expect(value(await service.listTrash())).toEqual([deleted])
    expect(value(await service.exportData())).toEqual([deleted])
    const restored = value(await service.restore(deleted))
    expect(restored.deletedAt).toBeUndefined()
    expect(restored.revision).toBe(3)
    expect(value(await service.list())).toEqual([restored])
  })
  it('imports validated backups as copies while preserving originals and rejects unsupported versions', async () => {
    const { service } = fixture()
    const original = value(
      await service.create({ title: 'Original', body: 'Keep' }),
    )
    const backup = { format: 'fieldnotes', version: 1, notes: [original] }
    expect(value(await service.importBackup(file(backup)))).toBe(1)
    const all = value(await service.exportData())
    expect(all).toHaveLength(2)
    expect(all[0]).toEqual(original)
    expect(all[1]?.id).not.toBe(original.id)
    expect(
      tagOf(await service.importBackup(file({ ...backup, version: 2 }))),
    ).toBe('InvalidBackup')
    expect(
      tagOf(
        await service.importBackup(
          file({ ...backup, notes: [original, { ...original, title: 17 }] }),
        ),
      ),
    ).toBe('InvalidBackup')
    expect(value(await service.exportData())).toHaveLength(2)
  })

  it.each(['createdAt', 'updatedAt', 'deletedAt'] as const)(
    'rejects an out-of-range %s in a backup before any write',
    async (field) => {
      const { service, repository } = fixture()
      const original = value(
        await service.create({ title: 'Keep', body: 'Existing note' }),
      )
      const write = vi.spyOn(repository, 'addMany')
      for (const timestamp of [8_640_000_000_000_001, 1e300]) {
        expect(
          tagOf(
            await service.importBackup(
              file({
                format: 'fieldnotes',
                version: 1,
                notes: [original, { ...original, [field]: timestamp }],
              }),
            ),
          ),
        ).toBe('InvalidBackup')
      }
      expect(write).not.toHaveBeenCalled()
      expect(value(await service.exportData())).toEqual([original])
    },
  )

  it('accepts the inclusive JavaScript Date timestamp limit', async () => {
    const { service } = fixture()
    const original = value(
      await service.create({ title: 'Date limit', body: '' }),
    )
    const limit = 8_640_000_000_000_000
    expect(
      value(
        await service.importBackup(
          file({
            format: 'fieldnotes',
            version: 1,
            notes: [
              {
                ...original,
                createdAt: limit,
                updatedAt: limit,
                deletedAt: limit,
              },
            ],
          }),
        ),
      ),
    ).toBe(1)
    expect(() => new Date(limit).toISOString()).not.toThrow()
  })
})

describe('given any mix of pinned, unpinned, and trashed notes', () => {
  it('should list pinned notes first, newest first, without trash', async () => {
    const plan = fc.array(
      fc.record({
        title: fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((t) => t.trim().length > 0),
        pinned: fc.boolean(),
        trashed: fc.boolean(),
      }),
      { maxLength: 15 },
    )
    await fc.assert(
      fc.asyncProperty(plan, async (entries) => {
        const { service } = fixture()
        await seed(service, entries)
        const listed = value(await service.list())
        expect(listed).toHaveLength(
          entries.filter((entry) => !entry.trashed).length,
        )
        expect(listed.every((note) => note.deletedAt === undefined)).toBe(true)
        expect(listed).toEqual(listed.toSorted(pinnedThenNewest))
      }),
    )
  })
})

describe('given a backup file over 10 MB', () => {
  it('should reject it before reading or writing anything', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10 * 1024 * 1024 + 1, max: 2 ** 40 }),
        async (size) => {
          const { service, repository } = fixture()
          const write = vi.spyOn(repository, 'addMany')
          const text = vi.fn<() => Promise<string>>(async () => '{}')
          const result = await service.importBackup({ size, text })
          expect(tagOf(result)).toBe('BackupFileTooLarge')
          expect(text).not.toHaveBeenCalled()
          expect(write).not.toHaveBeenCalled()
        },
      ),
    )
  })
})

describe('given a backup file the browser cannot read', () => {
  it('should report it as unreadable', async () => {
    const { service } = fixture()
    const result = await service.importBackup({
      size: 10,
      text: () => Promise.reject(new Error('NotReadableError')),
    })
    expect(tagOf(result)).toBe('BackupUnreadable')
  })
})

describe('given storage that fails during a backup', () => {
  it('should carry the storage failure through import and export', async () => {
    const { service, repository } = fixture()
    vi.spyOn(repository, 'addMany').mockRejectedValue(new Error('quota'))
    vi.spyOn(repository, 'list').mockResolvedValue(
      Result.err({ kind: 'corrupt', message: 'Unreadable rows' }),
    )
    const imported = await service.importBackup(
      file({ format: 'fieldnotes', version: 1, notes: [] }),
    )
    const exported = await service.exportBackup()
    expect(imported).toMatchObject({
      status: 'error',
      error: expect.objectContaining({
        _tag: 'BackupStorageFailed',
        failure: expect.objectContaining({ kind: 'storage' }),
      }),
    })
    expect(exported).toMatchObject({
      status: 'error',
      error: expect.objectContaining({
        _tag: 'BackupStorageFailed',
        failure: { kind: 'corrupt', message: 'Unreadable rows' },
      }),
    })
  })
})

describe('given any notebook', () => {
  it('should import its exported backup as the same notes with new ids', async () => {
    const entry = fc.record({
      title: fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((title) => title.trim().length > 0),
      body: fc.string({ maxLength: 50 }),
      trashed: fc.boolean(),
    })
    await fc.assert(
      fc.asyncProperty(fc.array(entry, { maxLength: 10 }), async (entries) => {
        const source = fixture('source').service
        await seed(source, entries)
        const backup = value(await source.exportBackup())
        expect(backup.count).toBe(entries.length)

        const target = fixture('target').service
        const imported = await target.importBackup({
          size: backup.json.length,
          text: async () => backup.json,
        })
        expect(value(imported)).toBe(entries.length)
        const content = ({ title, body, deletedAt }: Note) => ({
          title,
          body,
          deletedAt,
        })
        const sourceNotes = value(await source.exportData())
        const targetNotes = value(await target.exportData())
        expect(targetNotes.map(content)).toEqual(sourceNotes.map(content))
        expect(targetNotes.every((note) => note.revision === 1)).toBe(true)
        const sourceIds = new Set(sourceNotes.map((note) => note.id))
        expect(targetNotes.some((note) => sourceIds.has(note.id))).toBe(false)
      }),
    )
  })
})
