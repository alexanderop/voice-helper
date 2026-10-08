import { afterEach, assert, describe, expect, it } from 'vitest'
import type { Result } from '@talk-coach/result'
import { analyze } from '../../domain/analysis'
import type { Drill } from '../../domain/drill'
import { createIndexedDbDrills } from './createIndexedDbDrills'

function value<T>(result: Result<T, unknown>): T {
  assert(result.isOk(), 'expected an ok result')
  return result.value
}

function failure<E>(result: Result<unknown, E>): E {
  assert(result.isErr(), 'expected an error result')
  return result.error
}

const opened: { close(): void }[] = []

function repository(name: string) {
  const adapter = createIndexedDbDrills({ indexedDB, name })
  opened.push(adapter)
  return adapter
}

const drill: Drill = {
  id: 'drill-1',
  kind: 'opening',
  prompt: 'Open your talk. Say your first 30 seconds.',
  recordedAt: 1_700_000_000_000,
  durationMs: 30_000,
  transcript: 'Um, hello, I think.',
  analysis: analyze('Um, hello, I think.', 30_000, []),
}

function putRaw(name: string, row: unknown) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.addEventListener('success', () => {
      const transaction = request.result.transaction('drills', 'readwrite')
      transaction.objectStore('drills').put(row)
      transaction.addEventListener('complete', () => {
        request.result.close()
        resolve()
      })
      transaction.addEventListener('error', () =>
        reject(new Error('put failed')),
      )
    })
  })
}

describe('createIndexedDbDrills', () => {
  afterEach(() => {
    opened.forEach((adapter) => adapter.close())
    opened.length = 0
  })

  it('keeps a saved drill across connections', async () => {
    const name = crypto.randomUUID()
    const first = repository(name)
    expect((await first.add(drill)).isOk()).toBe(true)
    first.close()
    const reopened = await repository(name).list()
    expect(value(reopened)).toEqual([drill])
  })

  it('skips a stored row that fails validation', async () => {
    const name = crypto.randomUUID()
    const drills = repository(name)
    await drills.add(drill)
    await putRaw(name, { id: 'broken', kind: 'speech', transcript: 42 })
    const listed = await drills.list()
    expect(value(listed).map((row) => row.id)).toEqual(['drill-1'])
  })

  it('rejects a duplicate id and clears everything', async () => {
    const drills = repository(crypto.randomUUID())
    await drills.add(drill)
    const duplicate = await drills.add(drill)
    expect(failure(duplicate)).toBe('storage-failed')
    await drills.clear()
    const listed = await drills.list()
    expect(value(listed)).toHaveLength(0)
  })
})
