import { Result } from '@talk-coach/result'
import * as v from 'valibot'
import { drillSchema, type Drill } from '../../domain/drill'
import type { DrillRepository } from '../../ports/ports'

type Stored<T> = Result<T, 'storage-failed'>
const STORE = 'drills'

export function createIndexedDbDrills({
  indexedDB,
  name = 'talk-coach',
}: {
  indexedDB: IDBFactory
  name?: string
}): DrillRepository & { close(): void } {
  let opening: Promise<Stored<IDBDatabase>> | undefined

  function open(): Promise<Stored<IDBDatabase>> {
    opening ??= new Promise<Stored<IDBDatabase>>((resolve) => {
      const request = indexedDB.open(name, 1)
      request.addEventListener('upgradeneeded', () => {
        request.result.createObjectStore(STORE, { keyPath: 'id' })
      })
      request.addEventListener('error', () =>
        resolve(Result.err('storage-failed')),
      )
      request.addEventListener('blocked', () =>
        resolve(Result.err('storage-failed')),
      )
      request.addEventListener('success', () => {
        const connection = request.result
        connection.addEventListener('versionchange', () => {
          connection.close()
          opening = undefined
        })
        resolve(Result.ok(connection))
      })
    }).then((result) => {
      if (result.isErr()) opening = undefined
      return result
    })
    return opening
  }

  /** Resolves only after the transaction commits, so success means stored. */
  async function run<T>(
    mode: IDBTransactionMode,
    execute: (store: IDBObjectStore) => () => T,
  ): Promise<Stored<T>> {
    const database = await open()
    if (database.isErr()) return database
    return new Promise((resolve) => {
      try {
        const transaction = database.value.transaction(STORE, mode)
        const read = execute(transaction.objectStore(STORE))
        transaction.addEventListener('complete', () =>
          resolve(Result.ok(read())),
        )
        transaction.addEventListener('abort', () =>
          resolve(Result.err('storage-failed')),
        )
      } catch {
        resolve(Result.err('storage-failed'))
      }
    })
  }

  return {
    async list() {
      const rows = await run('readonly', (store) => {
        const request = store.getAll()
        return (): unknown[] => request.result
      })
      if (rows.isErr()) return rows
      // A row that no longer matches the schema is left in place and skipped.
      return Result.ok(
        rows.value.flatMap((row): Drill[] => {
          const parsed = v.safeParse(drillSchema, row)
          return parsed.success ? [parsed.output] : []
        }),
      )
    },
    add: (drill) =>
      run('readwrite', (store) => {
        store.add(drill)
        return () => undefined
      }),
    clear: () =>
      run('readwrite', (store) => {
        store.clear()
        return () => undefined
      }),
    close() {
      void opening?.then((result) => {
        if (result.isOk()) result.value.close()
      })
      opening = undefined
    },
  }
}
