import { shallowRef, type Ref } from 'vue'
import { useEventListener } from './useEventListener'

/** Tracks whether a CSS media query currently matches. */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const list = window.matchMedia(query)
  const matches = shallowRef(list.matches)
  useEventListener(list, 'change', (event) => {
    matches.value = event.matches
  })
  return matches
}
