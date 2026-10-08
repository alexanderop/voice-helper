import { onScopeDispose, shallowRef } from 'vue'
import { TIME_LIMIT_MS, type DrillKind } from '../domain/drill'
import { transition, type Session, type SessionEvent } from '../domain/session'
import type { DrillService } from '../application/createDrillService'
import type { Microphone, Recording } from '../ports/ports'

type SpokenKind = Exclude<DrillKind, 'import'>

export function useRecordingSession({
  service,
  microphone,
  now = Date.now,
}: {
  service: DrillService
  microphone?: Microphone
  now?: () => number
}) {
  const session = shallowRef<Session>({ status: 'idle' })
  const clock = shallowRef(now())
  let recording: Recording | undefined
  let take: { kind: SpokenKind; prompt: string } | undefined
  let limit: ReturnType<typeof setTimeout> | undefined
  let ticker: ReturnType<typeof setInterval> | undefined

  /** Read fresh after each await: a reset can land while the mic prompt is open. */
  const status = () => session.value.status

  function dispatch(event: SessionEvent) {
    session.value = transition(session.value, event)
  }

  function stopTimers() {
    clearTimeout(limit)
    clearInterval(ticker)
  }

  async function analyze(kind: DrillKind, prompt: string, audio: Blob) {
    const result = await service.analyzeAudio({
      kind,
      prompt,
      audio,
      onStage: (stage) => dispatch({ type: 'progress', stage }),
    })
    dispatch(
      result.isOk()
        ? { type: 'saved', drillId: result.value.id }
        : { type: 'fail', error: result.error },
    )
  }

  async function stop() {
    if (session.value.status !== 'recording' || !recording || !take) return
    stopTimers()
    dispatch({ type: 'stop' })
    const audio = await recording.stop()
    recording = undefined
    await analyze(take.kind, take.prompt, audio)
  }

  async function start(kind: SpokenKind, prompt: string) {
    if (!microphone) return
    dispatch({ type: 'start' })
    if (status() !== 'requesting-mic') return
    const opened = await microphone.start()
    if (opened.isErr()) {
      dispatch({ type: 'fail', error: opened.error })
      return
    }
    if (status() !== 'requesting-mic') {
      opened.value.cancel()
      return
    }
    recording = opened.value
    take = { kind, prompt }
    dispatch({ type: 'mic-ready', at: now(), limitMs: TIME_LIMIT_MS[kind] })
    clock.value = now()
    ticker = setInterval(() => (clock.value = now()), 250)
    limit = setTimeout(() => void stop(), TIME_LIMIT_MS[kind])
  }

  async function analyzeFile(file: File) {
    dispatch({ type: 'import' })
    if (status() !== 'processing') return
    await analyze('import', file.name, file)
  }

  onScopeDispose(() => {
    stopTimers()
    recording?.cancel()
  })

  return {
    session,
    remainingMs: () =>
      session.value.status === 'recording'
        ? Math.max(
            0,
            session.value.limitMs - (clock.value - session.value.startedAt),
          )
        : undefined,
    start,
    stop,
    analyzeFile,
    reset: () => dispatch({ type: 'reset' }),
  }
}
