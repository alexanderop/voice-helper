export type SessionError =
  | 'mic-denied'
  | 'mic-unavailable'
  | 'model-failed'
  | 'too-short'
  | 'decode-failed'
  | 'storage-failed'

export type ProcessingStage =
  | { readonly step: 'decoding' }
  | {
      readonly step: 'transcribing'
      readonly chunk: number
      readonly chunks: number
    }
  | { readonly step: 'saving' }

export type Session =
  | { readonly status: 'idle' }
  | { readonly status: 'requesting-mic' }
  | {
      readonly status: 'recording'
      readonly startedAt: number
      readonly limitMs: number
    }
  | { readonly status: 'processing'; readonly stage: ProcessingStage }
  | { readonly status: 'done'; readonly drillId: string }
  | { readonly status: 'error'; readonly error: SessionError }

export type SessionEvent =
  | { readonly type: 'start' }
  | {
      readonly type: 'mic-ready'
      readonly at: number
      readonly limitMs: number
    }
  | { readonly type: 'stop' }
  | { readonly type: 'import' }
  | { readonly type: 'progress'; readonly stage: ProcessingStage }
  | { readonly type: 'saved'; readonly drillId: string }
  | { readonly type: 'fail'; readonly error: SessionError }
  | { readonly type: 'reset' }

/** Which events each state accepts. Anything else leaves the state unchanged. */
const ACCEPTS: Readonly<
  Record<Session['status'], readonly SessionEvent['type'][]>
> = {
  idle: ['start', 'import'],
  'requesting-mic': ['mic-ready', 'fail', 'reset'],
  recording: ['stop', 'fail'],
  processing: ['progress', 'saved', 'fail'],
  done: ['start', 'import', 'reset'],
  error: ['start', 'import', 'reset'],
}

function enter(event: SessionEvent): Session {
  switch (event.type) {
    case 'start':
      return { status: 'requesting-mic' }
    case 'mic-ready':
      return {
        status: 'recording',
        startedAt: event.at,
        limitMs: event.limitMs,
      }
    case 'stop':
    case 'import':
      return { status: 'processing', stage: { step: 'decoding' } }
    case 'progress':
      return { status: 'processing', stage: event.stage }
    case 'saved':
      return { status: 'done', drillId: event.drillId }
    case 'fail':
      return { status: 'error', error: event.error }
    case 'reset':
      break
  }
  return { status: 'idle' }
}

export function transition(state: Session, event: SessionEvent): Session {
  return ACCEPTS[state.status].includes(event.type) ? enter(event) : state
}

export const isBusy = (session: Session) =>
  session.status === 'requesting-mic' ||
  session.status === 'recording' ||
  session.status === 'processing'
