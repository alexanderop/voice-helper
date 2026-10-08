import { describe, expect, it } from 'vitest'
import { useDocumentVisibility } from './useDocumentVisibility'
import { scoped } from './testing'

// Headless Chrome cannot hide a page, so the visibility state is driven on a
// separate real Document whose visibilityState we control.
function controllableDocument() {
  const target = document.implementation.createHTMLDocument()
  let state: DocumentVisibilityState = 'visible'
  Object.defineProperty(target, 'visibilityState', { get: () => state })
  return {
    target,
    show: (next: DocumentVisibilityState) => {
      state = next
      target.dispatchEvent(new Event('visibilitychange'))
    },
  }
}

describe('useDocumentVisibility', () => {
  describe('given the real document', () => {
    it('should start as visible', () => {
      const { value, stop } = scoped(() => useDocumentVisibility())
      expect(value.value).toBe('visible')
      stop()
    })
  })

  describe('given an injected document', () => {
    it('should follow visibilitychange events until its scope stops', () => {
      const { target, show } = controllableDocument()
      const { value, stop } = scoped(() => useDocumentVisibility(target))
      expect(value.value).toBe('visible')
      show('hidden')
      expect(value.value).toBe('hidden')
      show('visible')
      expect(value.value).toBe('visible')
      stop()
      show('hidden')
      expect(value.value).toBe('visible')
    })
  })
})
