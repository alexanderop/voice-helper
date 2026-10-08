import { Result } from '@talk-coach/result'
import * as v from 'valibot'
import {
  downloadTotals,
  type FileProgress,
  type ModelStatus,
  type SpeechDiagnostics,
} from '../domain/model'
import {
  responseSchema,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol'

const SAMPLE_RATE = 16_000

type Pending = {
  readonly audioMs: number
  readonly onChunk: (done: number, total: number) => void
  readonly resolve: (result: Result<string, 'model-failed'>) => void
}

export type ModelCache = {
  isCached(): Promise<boolean>
  keepRuntime(): Promise<void>
}

/**
 * Talks to the Whisper worker. `onStatus` receives every model state change.
 * At start a cached model loads right away; otherwise the model waits for the
 * user to start the download.
 */
export function createWhisperTranscriber({
  createWorker,
  cache,
  onStatus,
}: {
  createWorker: () => Worker
  cache: ModelCache
  onStatus: (status: ModelStatus) => void
}) {
  let worker: Worker | undefined
  let status: ModelStatus = { status: 'checking' }
  let fromNetwork = false
  let nextId = 0
  const files = new Map<string, FileProgress>()
  const pending = new Map<number, Pending>()
  let diagnostics: SpeechDiagnostics = {
    backend: null,
    loadMs: null,
    lastTranscription: null,
  }

  function set(next: ModelStatus) {
    status = next
    onStatus(next)
  }

  async function handle(message: WorkerResponse) {
    switch (message.type) {
      case 'download':
        files.set(message.file, message)
        if (fromNetwork)
          set({ status: 'downloading', ...downloadTotals(files) })
        return
      case 'loaded':
        diagnostics = {
          ...diagnostics,
          backend: message.backend,
          loadMs: message.loadMs,
        }
        await cache.keepRuntime()
        set({
          status: 'ready',
          backend: message.backend,
          loadMs: message.loadMs,
          offline: await cache.isCached(),
        })
        return
      case 'load-failed':
        set({ status: 'failed', reason: message.reason })
        return
      case 'chunk':
      case 'transcribed':
      case 'transcribe-failed':
        settle(message)
    }
  }

  function settle(
    message: Exclude<
      WorkerResponse,
      { type: 'download' | 'loaded' | 'load-failed' }
    >,
  ) {
    const request = pending.get(message.id)
    if (!request) return
    if (message.type === 'chunk') {
      request.onChunk(message.done, message.total)
      return
    }
    pending.delete(message.id)
    if (message.type === 'transcribe-failed') {
      request.resolve(Result.err('model-failed'))
      return
    }
    diagnostics = {
      ...diagnostics,
      lastTranscription: { ms: message.ms, audioMs: request.audioMs },
    }
    request.resolve(Result.ok(message.text))
  }

  function connect(): Worker {
    if (worker) return worker
    const created = createWorker()
    created.addEventListener('message', (event: MessageEvent<unknown>) => {
      const message = v.safeParse(responseSchema, event.data)
      if (message.success) void handle(message.output)
    })
    created.addEventListener('error', () => {
      set({ status: 'failed', reason: 'The speech worker stopped.' })
      for (const request of pending.values())
        request.resolve(Result.err('model-failed'))
      pending.clear()
    })
    worker = created
    return created
  }

  function send(request: WorkerRequest) {
    connect().postMessage(request)
  }

  function load(network: boolean) {
    if (['loading', 'downloading', 'ready'].includes(status.status)) return
    fromNetwork = network
    set({ status: 'loading' })
    send({ type: 'load' })
  }

  return {
    /** Loads a cached model at launch. Never downloads on its own. */
    async start() {
      if (await cache.isCached()) load(false)
      else set({ status: 'missing' })
    },
    download: () => load(true),
    transcribe(
      audio: Float32Array,
      onChunk: (done: number, total: number) => void,
    ): Promise<Result<string, 'model-failed'>> {
      if (status.status !== 'ready')
        return Promise.resolve(Result.err('model-failed'))
      const id = ++nextId
      return new Promise((resolve) => {
        pending.set(id, {
          audioMs: Math.round((audio.length / SAMPLE_RATE) * 1000),
          onChunk,
          resolve,
        })
        send({ type: 'transcribe', id, audio: audio.slice() })
      })
    },
    diagnostics: (): SpeechDiagnostics => diagnostics,
  }
}

export function createWhisperWorker() {
  return new Worker(new URL('./whisper.worker.ts', import.meta.url), {
    type: 'module',
  })
}
