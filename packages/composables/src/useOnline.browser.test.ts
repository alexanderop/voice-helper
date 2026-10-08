import { describe, expect, it } from 'vitest'
import { watch } from 'vue'
import { commands } from 'vitest/browser'
import { useOnline } from './useOnline'
import { scoped } from './testing'

describe('useOnline', () => {
  describe('given the browser context goes offline and back', () => {
    it('should follow the real offline and online events', async () => {
      const history: boolean[] = []
      const { value: online, stop } = scoped(() => {
        const state = useOnline()
        watch(state, (next) => history.push(next), { flush: 'sync' })
        return state
      })
      expect(online.value).toBe(true)
      await commands.goOfflineFor(500)
      await expect.poll(() => online.value).toBe(true)
      expect(history).toEqual([false, true])
      stop()
    })
  })
})
