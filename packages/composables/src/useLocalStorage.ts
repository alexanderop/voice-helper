import { shallowRef, type Ref } from 'vue'
import type { Result } from '@starter/result'
import * as v from 'valibot'
import {
  readStorage,
  writeStorage,
  type StorageReadError,
  type StorageWriteError,
} from './storage'
import { useEventListener } from './useEventListener'

/**
 * A validated, JSON-encoded value kept in `localStorage` and synced across tabs.
 * Corrupt stored data is never overwritten by a read; `set` updates the
 * in-memory state first so the UI works even when saving fails.
 */
export function useLocalStorage<S extends v.GenericSchema>(
  key: string,
  schema: S,
  {
    fallback,
    storage = () => window.localStorage,
  }: { fallback: v.InferOutput<S>; storage?: () => Storage },
): {
  state: Readonly<Ref<v.InferOutput<S>>>
  readError: Readonly<Ref<StorageReadError | null>>
  set: (next: v.InferOutput<S>) => Result<void, StorageWriteError>
} {
  const state = shallowRef<v.InferOutput<S>>(fallback)
  const readError = shallowRef<StorageReadError | null>(null)

  function load() {
    readStorage(storage, key, schema).match({
      ok: (value) => {
        readError.value = null
        if (value === undefined) state.value = fallback
        else state.value = value
      },
      err: (error) => {
        readError.value = error
        state.value = fallback
      },
    })
  }
  function set(next: v.InferOutput<S>) {
    state.value = next
    const result = writeStorage(storage, key, next)
    if (result.isOk()) readError.value = null
    return result
  }
  function ownsEvent(event: StorageEvent) {
    try {
      return event.storageArea === storage()
    } catch {
      return false
    }
  }

  load()
  useEventListener(window, 'storage', (event) => {
    if (!ownsEvent(event)) return
    if (event.key === key || event.key === null) load()
  })
  return { state, readError, set }
}
