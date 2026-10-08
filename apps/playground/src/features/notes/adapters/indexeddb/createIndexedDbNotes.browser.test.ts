import { afterEach, describe, expect, it } from 'vitest'
import { createIndexedDbNotes } from './createIndexedDbNotes'
import type { Note } from '../../domain/note'

const databases: string[] = []
const connections: ReturnType<typeof createIndexedDbNotes>[] = []
const note: Note = {
  id: 'one',
  title: 'Keep this',
  body: 'Available offline',
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
}

function repository(name = `notes-test-${crypto.randomUUID()}`) {
  if (!databases.includes(name)) databases.push(name)
  const adapter = createIndexedDbNotes({ indexedDB, name })
  connections.push(adapter)
  return { adapter, name }
}

function asError(error: DOMException | null) {
  return error ?? new Error('IndexedDB operation failed')
}

describe('IndexedDB notes adapter', () => {
  afterEach(async () => {
    connections.splice(0).forEach((connection) => connection.close())
    await Promise.all(
      databases.splice(0).map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(name)
            request.onsuccess = () => resolve()
            request.onerror = () => reject(asError(request.error))
          }),
      ),
    )
  })

  it('commits notes before reporting success and persists through a new connection', async () => {
    const { adapter, name } = repository()
    expect(await adapter.save(note, null)).toEqual({
      status: 'ok',
      value: note,
    })
    adapter.close()
    const reopened = repository(name).adapter
    expect(await reopened.list()).toEqual({ status: 'ok', value: [note] })
    expect(await reopened.remove(note.id, 1)).toEqual({
      status: 'ok',
      value: undefined,
    })
    expect(await reopened.list()).toEqual({ status: 'ok', value: [] })
  })

  it('atomically rejects one of two concurrent writes and prevents stale deletion', async () => {
    const { adapter, name } = repository()
    await adapter.save(note, null)
    const other = repository(name).adapter
    const attempts = await Promise.all([
      adapter.save({ ...note, title: 'Tab one', revision: 2 }, 1),
      other.save({ ...note, title: 'Tab two', revision: 2 }, 1),
    ])
    expect(attempts.filter((result) => result.isOk())).toHaveLength(1)
    expect(attempts.filter((result) => result.isErr())).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ kind: 'conflict' }),
      }),
    ])
    expect(await other.remove(note.id, 1)).toMatchObject({
      status: 'error',
      error: { kind: 'conflict' },
    })
    const persisted = await other.list()
    expect(persisted).toMatchObject({ status: 'ok', value: [{ revision: 2 }] })
  })

  it('reports invalid stored data without overwriting or deleting it', async () => {
    const { adapter, name } = repository()
    await adapter.list()
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(asError(request.error))
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = raw.transaction('notes', 'readwrite')
      transaction.objectStore('notes').put({ id: 'one', title: 17 })
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(asError(transaction.error))
    })
    raw.close()
    expect(await adapter.list()).toMatchObject({
      status: 'error',
      error: { kind: 'corrupt' },
    })
    expect(await adapter.save(note, 1)).toMatchObject({
      status: 'error',
      error: { kind: 'corrupt' },
    })
    expect(await adapter.remove(note.id, 1)).toMatchObject({
      status: 'error',
      error: { kind: 'corrupt' },
    })
  })

  it('does not reopen a closed adapter, including close during lazy opening', async () => {
    const { adapter } = repository()
    const pending = adapter.list()
    adapter.close()
    expect(await pending).toMatchObject({
      status: 'error',
      error: { kind: 'storage' },
    })
    expect(await adapter.list()).toMatchObject({
      status: 'error',
      error: { kind: 'storage' },
    })
  })

  it('releases its connection for upgrades and requires a reload afterwards', async () => {
    const { adapter, name } = repository()
    await adapter.save(note, null)
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(asError(request.error))
    })
    upgraded.close()
    expect(await adapter.list()).toMatchObject({
      status: 'error',
      error: { kind: 'storage' },
    })
    expect(await repository(name).adapter.list()).toMatchObject({
      status: 'error',
      error: { kind: 'storage' },
    })
  })

  it('upgrades legacy notes without losing data and prevents old clients reopening version 1', async () => {
    const name = `notes-test-${crypto.randomUUID()}`
    databases.push(name)
    const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () =>
        request.result.createObjectStore('notes', { keyPath: 'id' })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(asError(request.error))
    })
    await new Promise<void>((resolve) => {
      const tx = legacy.transaction('notes', 'readwrite')
      tx.objectStore('notes').put(note)
      tx.oncomplete = () => resolve()
    })
    legacy.onversionchange = () => legacy.close()
    const adapter = repository(name).adapter
    expect(await adapter.list()).toEqual({ status: 'ok', value: [note] })
    expect(
      await adapter.save({ ...note, deletedAt: 2, revision: 2 }, 1),
    ).toMatchObject({ status: 'ok' })
    const oldError = await new Promise<string>((resolve) => {
      const request = indexedDB.open(name, 1)
      request.onerror = () => resolve(String(request.error?.name))
    })
    expect(oldError).toBe('VersionError')
    expect(await adapter.list()).toMatchObject({
      status: 'ok',
      value: [{ deletedAt: 2 }],
    })
  })
  it('rolls back the whole import when a generated identity collides', async () => {
    const { adapter } = repository()
    await adapter.save(note, null)
    expect(await adapter.addMany([{ ...note, id: 'new' }, note])).toMatchObject(
      {
        status: 'error',
      },
    )
    expect(await adapter.list()).toEqual({ status: 'ok', value: [note] })
  })
})
