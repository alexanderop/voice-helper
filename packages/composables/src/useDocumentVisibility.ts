import { shallowRef, type Ref } from 'vue'
import { useEventListener } from './useEventListener'

/** Tracks `document.visibilityState`. The target is injectable for tests. */
export function useDocumentVisibility(
  target: Document = document,
): Readonly<Ref<DocumentVisibilityState>> {
  const visibility = shallowRef(target.visibilityState)
  useEventListener(target, 'visibilitychange', () => {
    visibility.value = target.visibilityState
  })
  return visibility
}
