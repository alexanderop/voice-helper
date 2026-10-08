import { Result, TaggedError } from '@starter/result'
import * as v from 'valibot'

export class StorageUnavailable extends TaggedError('StorageUnavailable')<{
  key: string
}> {}
export class StoredValueInvalid extends TaggedError('StoredValueInvalid')<{
  key: string
}> {}
export class StorageQuotaExceeded extends TaggedError('StorageQuotaExceeded')<{
  key: string
}> {}

export type StorageReadError = StorageUnavailable | StoredValueInvalid
export type StorageWriteError = StorageUnavailable | StorageQuotaExceeded

/**
 * Reads and validates a JSON value. A missing key is `ok(undefined)`.
 * `storage` is a getter because merely touching `window.localStorage`
 * throws when the browser blocks site data.
 */
export function readStorage<S extends v.GenericSchema>(
  storage: () => Storage,
  key: string,
  schema: S,
): Result<v.InferOutput<S> | undefined, StorageReadError> {
  return Result.try({
    try: () => storage().getItem(key),
    catch: () => new StorageUnavailable({ key }),
  }).andThen((raw) => {
    if (raw === null) return Result.ok(undefined)
    return Result.try({
      try: (): unknown => JSON.parse(raw),
      catch: () => new StoredValueInvalid({ key }),
    }).andThen((json) => {
      const parsed = v.safeParse(schema, json)
      return parsed.success
        ? Result.ok(parsed.output)
        : Result.err(new StoredValueInvalid({ key }))
    })
  })
}

export function writeStorage(
  storage: () => Storage,
  key: string,
  value: unknown,
): Result<void, StorageWriteError> {
  return Result.try({
    try: () => {
      storage().setItem(key, JSON.stringify(value))
    },
    catch: (cause) =>
      cause instanceof DOMException && cause.name === 'QuotaExceededError'
        ? new StorageQuotaExceeded({ key })
        : new StorageUnavailable({ key }),
  })
}
