import { effectScope } from 'vue'

/** Runs `fn` in an effect scope and returns its result with a way to stop it. */
export function scoped<T>(fn: () => T): { value: T; stop: () => void } {
  const scope = effectScope()
  const value = scope.run(fn)
  if (value === undefined) throw new Error('The effect scope was not active')
  return { value, stop: () => scope.stop() }
}
