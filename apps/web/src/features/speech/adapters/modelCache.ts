import { MODEL_FILES, MODEL_ID } from '../domain/model'

/** transformers.js 3.x stores downloads in this Cache API bucket. */
const MODEL_CACHE = 'transformers-cache'
/** The service worker serves the ONNX runtime from this bucket offline. */
const RUNTIME_CACHE = 'talk-coach-onnx-runtime'
const RUNTIME_FILES = ['ort-wasm-simd-threaded.jsep.wasm'] as const

export function createModelCache({
  caches,
  runtimeBase,
}: {
  caches: CacheStorage | undefined
  runtimeBase: string
}) {
  const modelUrls = MODEL_FILES.map(
    (file) => `https://huggingface.co/${MODEL_ID}/resolve/main/${file}`,
  )
  const runtimeUrls = RUNTIME_FILES.map(
    (file) => new URL(file, runtimeBase).href,
  )

  async function missing(cacheName: string, urls: readonly string[]) {
    if (!caches) return [...urls]
    const found = await Promise.all(
      urls.map((url) => caches.match(url, { cacheName })),
    )
    return urls.filter((_, index) => !found[index])
  }

  return {
    /** True only when every model and runtime file is stored locally. */
    async isCached() {
      try {
        const [model, runtime] = await Promise.all([
          missing(MODEL_CACHE, modelUrls),
          missing(RUNTIME_CACHE, runtimeUrls),
        ])
        return model.length === 0 && runtime.length === 0
      } catch {
        return false
      }
    },
    /** Stores the runtime even when no service worker controlled the fetch. */
    async keepRuntime() {
      try {
        const absent = await missing(RUNTIME_CACHE, runtimeUrls)
        if (caches && absent.length)
          await (await caches.open(RUNTIME_CACHE)).addAll(absent)
      } catch {
        // isCached reports the gap and the app stays "not offline ready".
      }
    },
  }
}
