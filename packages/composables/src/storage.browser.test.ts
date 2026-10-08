import { afterEach, assert, describe, expect, it } from 'vitest'
import * as fc from 'fast-check'
import * as v from 'valibot'
import {
  StorageQuotaExceeded,
  StorageUnavailable,
  StoredValueInvalid,
  readStorage,
  writeStorage,
} from './storage'

const local = () => window.localStorage
const blocked = (): Storage => {
  throw new DOMException('blocked', 'SecurityError')
}

describe('storage', () => {
  afterEach(() => localStorage.clear())

  describe('given a missing key', () => {
    it('should read ok(undefined)', () => {
      const result = readStorage(local, 'missing', v.string())
      assert(result.isOk(), 'Expected a missing key to be ok')
      expect(result.value).toBeUndefined()
    })
  })

  describe('given stored JSON', () => {
    it('should read the validated value', () => {
      localStorage.setItem('k', JSON.stringify('dark'))
      const result = readStorage(local, 'k', v.picklist(['dark', 'light']))
      assert(result.isOk(), 'Expected a valid value to be ok')
      expect(result.value).toBe('dark')
    })

    it('should report StoredValueInvalid for corrupt JSON', () => {
      localStorage.setItem('k', '{nope')
      const result = readStorage(local, 'k', v.string())
      assert(result.isErr(), 'Expected corrupt JSON to fail')
      expect(result.error).toBeInstanceOf(StoredValueInvalid)
    })

    it('should report StoredValueInvalid when the schema rejects it', () => {
      localStorage.setItem('k', JSON.stringify('purple'))
      const result = readStorage(local, 'k', v.picklist(['dark', 'light']))
      assert(result.isErr(), 'Expected an invalid value to fail')
      expect(result.error).toBeInstanceOf(StoredValueInvalid)
    })
  })

  describe('given storage that throws on access', () => {
    it('should report StorageUnavailable on read', () => {
      const result = readStorage(blocked, 'k', v.string())
      assert(result.isErr(), 'Expected blocked storage to fail')
      expect(result.error).toBeInstanceOf(StorageUnavailable)
    })

    it('should report StorageUnavailable on write', () => {
      const result = writeStorage(blocked, 'k', 'x')
      assert(result.isErr(), 'Expected blocked storage to fail')
      expect(result.error).toBeInstanceOf(StorageUnavailable)
    })
  })

  describe('given a value larger than the real quota', () => {
    it('should report StorageQuotaExceeded and keep the previous value', () => {
      expect(writeStorage(local, 'k', 'small').isOk()).toBe(true)
      const result = writeStorage(local, 'k', 'x'.repeat(6_000_000))
      assert(result.isErr(), 'Expected the quota to be exceeded')
      expect(result.error).toBeInstanceOf(StorageQuotaExceeded)
      expect(localStorage.getItem('k')).toBe('"small"')
    })
  })

  describe('given any JSON value', () => {
    it('should survive a write followed by a read', () => {
      fc.assert(
        fc.property(fc.jsonValue(), (value) => {
          const written = writeStorage(local, 'prop', value)
          assert(written.isOk(), 'Expected the write to succeed')
          const read = readStorage(local, 'prop', v.unknown())
          assert(read.isOk(), 'Expected the read to succeed')
          expect(JSON.stringify(read.value)).toBe(JSON.stringify(value))
        }),
      )
    })
  })
})
