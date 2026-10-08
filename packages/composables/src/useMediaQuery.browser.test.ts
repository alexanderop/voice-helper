import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { useMediaQuery } from './useMediaQuery'
import { scoped } from './testing'

describe('useMediaQuery', () => {
  afterEach(() => page.viewport(414, 896))

  describe('given a max-width query', () => {
    it('should follow real viewport changes', async () => {
      await page.viewport(375, 800)
      const { value: narrow, stop } = scoped(() =>
        useMediaQuery('(max-width: 767px)'),
      )
      expect(narrow.value).toBe(true)
      await page.viewport(1024, 800)
      await expect.poll(() => narrow.value).toBe(false)
      await page.viewport(375, 800)
      await expect.poll(() => narrow.value).toBe(true)
      stop()
    })

    it('should stop updating once its scope stops', async () => {
      await page.viewport(375, 800)
      const { value: narrow, stop } = scoped(() =>
        useMediaQuery('(max-width: 767px)'),
      )
      stop()
      await page.viewport(1024, 800)
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(narrow.value).toBe(true)
    })
  })
})
