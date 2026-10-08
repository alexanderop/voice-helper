import { afterEach, assert, describe, expect, it } from 'vitest'
import * as v from 'valibot'
import {
  StorageQuotaExceeded,
  StorageUnavailable,
  StoredValueInvalid,
} from './storage'
import { useLocalStorage } from './useLocalStorage'
import { scoped } from './testing'

const schema = v.picklist(['system', 'light', 'dark'])
const open = (storage: () => Storage = () => window.localStorage) =>
  scoped(() =>
    useLocalStorage('theme', schema, { fallback: 'system', storage }),
  )

describe('useLocalStorage', () => {
  afterEach(() => localStorage.clear())

  describe('given nothing stored', () => {
    it('should use the fallback without a read error', () => {
      const { value, stop } = open()
      expect(value.state.value).toBe('system')
      expect(value.readError.value).toBeNull()
      stop()
    })
  })

  describe('given a valid stored value', () => {
    it('should load it', () => {
      localStorage.setItem('theme', '"dark"')
      const { value, stop } = open()
      expect(value.state.value).toBe('dark')
      stop()
    })
  })

  describe('given corrupt or invalid stored data', () => {
    it.each(['{nope', '"purple"'])(
      'should fall back, report StoredValueInvalid, and leave %s untouched',
      (raw) => {
        localStorage.setItem('theme', raw)
        const { value, stop } = open()
        expect(value.state.value).toBe('system')
        expect(value.readError.value).toBeInstanceOf(StoredValueInvalid)
        expect(localStorage.getItem('theme')).toBe(raw)
        stop()
      },
    )
  })

  describe('given set()', () => {
    it('should update state and persist the value', () => {
      const { value, stop } = open()
      expect(value.set('light').isOk()).toBe(true)
      expect(value.state.value).toBe('light')
      expect(localStorage.getItem('theme')).toBe('"light"')
      stop()
    })

    it('should update state even when storage is blocked', () => {
      const blocked = (): Storage => {
        throw new DOMException('blocked', 'SecurityError')
      }
      const { value, stop } = open(blocked)
      expect(value.readError.value).toBeInstanceOf(StorageUnavailable)
      const result = value.set('dark')
      assert(result.isErr(), 'Expected blocked storage to fail')
      expect(result.error).toBeInstanceOf(StorageUnavailable)
      expect(value.state.value).toBe('dark')
      stop()
    })

    it('should update state even when the real quota is exceeded', () => {
      const big = useLocalStorage('big', v.string(), { fallback: '' })
      const result = big.set('x'.repeat(6_000_000))
      assert(result.isErr(), 'Expected the quota to be exceeded')
      expect(result.error).toBeInstanceOf(StorageQuotaExceeded)
      expect(big.state.value).toHaveLength(6_000_000)
    })
  })

  describe('given a corrupt stored value', () => {
    it('should clear readError once set() replaces it', () => {
      localStorage.setItem('theme', '{nope')
      const { value, stop } = open()
      expect(value.readError.value).toBeInstanceOf(StoredValueInvalid)
      expect(value.set('dark').isOk()).toBe(true)
      expect(value.readError.value).toBeNull()
      stop()
    })
  })

  describe('given another storage area changes the same key', () => {
    it('should ignore sessionStorage events', async () => {
      const frame = document.createElement('iframe')
      frame.src = 'about:blank'
      document.body.append(frame)
      const other = frame.contentWindow?.sessionStorage
      assert(other, 'The iframe has no sessionStorage')
      const { value, stop } = open()
      expect(value.set('dark').isOk()).toBe(true)
      localStorage.setItem('theme', '"light"')
      const seen = new Promise<StorageEvent>((resolve) =>
        window.addEventListener('storage', resolve, { once: true }),
      )
      other.setItem('theme', '"system"')
      const event = await seen
      expect(event.storageArea).toBe(window.sessionStorage)
      expect(value.state.value).toBe('dark')
      const cleared = new Promise<StorageEvent>((resolve) =>
        window.addEventListener('storage', resolve, { once: true }),
      )
      other.clear()
      await cleared
      expect(value.state.value).toBe('dark')
      stop()
      frame.remove()
    })
  })

  describe('given another same-origin document changes the value', () => {
    it('should follow real storage events and return to the fallback on removal', async () => {
      const frame = document.createElement('iframe')
      frame.src = 'about:blank'
      document.body.append(frame)
      const other = frame.contentWindow?.localStorage
      assert(other, 'The iframe has no localStorage')
      const { value, stop } = open()
      other.setItem('theme', '"dark"')
      await expect.poll(() => value.state.value).toBe('dark')
      other.removeItem('theme')
      await expect.poll(() => value.state.value).toBe('system')
      stop()
      frame.remove()
    })
  })
})
