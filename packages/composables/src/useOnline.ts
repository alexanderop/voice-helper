import { shallowRef, type Ref } from 'vue'
import { useEventListener } from './useEventListener'

/** Tracks the browser's online state from `navigator.onLine`. */
export function useOnline(): Readonly<Ref<boolean>> {
  const online = shallowRef(navigator.onLine)
  useEventListener(window, 'online', () => {
    online.value = true
  })
  useEventListener(window, 'offline', () => {
    online.value = false
  })
  return online
}
