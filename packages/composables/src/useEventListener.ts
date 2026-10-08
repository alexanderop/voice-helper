import { getCurrentScope, onScopeDispose } from 'vue'

/**
 * Adds an event listener immediately and returns an idempotent `stop()`.
 * Inside a Vue effect scope (component setup, `effectScope()`), the listener
 * is also removed when the scope is disposed.
 */
export function useEventListener<K extends keyof WindowEventMap>(
  target: Window,
  event: K,
  listener: (event: WindowEventMap[K]) => void,
): () => void
export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  event: K,
  listener: (event: DocumentEventMap[K]) => void,
): () => void
export function useEventListener<K extends keyof MediaQueryListEventMap>(
  target: MediaQueryList,
  event: K,
  listener: (event: MediaQueryListEventMap[K]) => void,
): () => void
export function useEventListener(
  target: EventTarget,
  event: string,
  listener: (event: Event) => void,
): () => void
export function useEventListener(
  target: EventTarget,
  event: string,
  listener: EventListener,
): () => void {
  target.addEventListener(event, listener)
  let active = true
  function stop() {
    if (!active) return
    active = false
    target.removeEventListener(event, listener)
  }
  if (getCurrentScope()) onScopeDispose(stop)
  return stop
}
