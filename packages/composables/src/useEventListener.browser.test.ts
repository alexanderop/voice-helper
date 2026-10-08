import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { render } from 'vitest-browser-vue'
import { useEventListener } from './useEventListener'
import { scoped } from './testing'

describe('useEventListener', () => {
  describe('given a listener inside an effect scope', () => {
    it('should call the listener for real events and stop when the scope stops', () => {
      const target = new EventTarget()
      let calls = 0
      const { stop } = scoped(() =>
        useEventListener(target, 'ping', () => {
          calls++
        }),
      )
      target.dispatchEvent(new Event('ping'))
      expect(calls).toBe(1)
      stop()
      target.dispatchEvent(new Event('ping'))
      expect(calls).toBe(1)
    })
  })

  describe('given a listener inside a mounted component', () => {
    it('should stop listening when the component unmounts', async () => {
      const target = new EventTarget()
      let calls = 0
      const Probe = defineComponent({
        setup() {
          useEventListener(target, 'ping', () => {
            calls++
          })
        },
        render: () => null,
      })
      const screen = await render(Probe)
      target.dispatchEvent(new Event('ping'))
      expect(calls).toBe(1)
      await screen.unmount()
      target.dispatchEvent(new Event('ping'))
      expect(calls).toBe(1)
    })
  })

  describe('given a listener outside any scope', () => {
    it('should listen until stop() is called, and stop() is safe to call twice', () => {
      let calls = 0
      const stop = useEventListener(window, 'resize', () => {
        calls++
      })
      window.dispatchEvent(new Event('resize'))
      expect(calls).toBe(1)
      stop()
      stop()
      window.dispatchEvent(new Event('resize'))
      expect(calls).toBe(1)
    })
  })

  describe('given a typed window event', () => {
    it('should pass the real event to the listener', () => {
      const keys: string[] = []
      const stop = useEventListener(window, 'keydown', (event) => {
        keys.push(event.key)
      })
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      stop()
      expect(keys).toEqual(['a'])
    })
  })
})
