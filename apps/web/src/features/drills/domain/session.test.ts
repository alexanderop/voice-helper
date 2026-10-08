import { describe, expect, it } from 'vitest'
import { transition, type Session, type SessionEvent } from './session'

function run(
  events: readonly SessionEvent[],
  from: Session = { status: 'idle' },
): Session {
  return events.reduce(transition, from)
}

describe('transition', () => {
  it('walks a recording from idle to done', () => {
    expect(
      run([
        { type: 'start' },
        { type: 'mic-ready', at: 5, limitMs: 120_000 },
        { type: 'stop' },
        {
          type: 'progress',
          stage: { step: 'transcribing', chunk: 1, chunks: 4 },
        },
        { type: 'saved', drillId: 'd1' },
      ]),
    ).toEqual({ status: 'done', drillId: 'd1' })
  })

  it('reports a denied microphone as an error state', () => {
    expect(
      run([{ type: 'start' }, { type: 'fail', error: 'mic-denied' }]),
    ).toEqual({
      status: 'error',
      error: 'mic-denied',
    })
  })

  it('ignores a stop that arrives before recording starts', () => {
    expect(run([{ type: 'start' }, { type: 'stop' }])).toEqual({
      status: 'requesting-mic',
    })
  })

  it('ignores a second start while processing', () => {
    const processing: Session = {
      status: 'processing',
      stage: { step: 'saving' },
    }
    expect(transition(processing, { type: 'start' })).toEqual(processing)
  })

  it('lets an import begin again after an error', () => {
    expect(
      transition({ status: 'error', error: 'too-short' }, { type: 'import' }),
    ).toEqual({
      status: 'processing',
      stage: { step: 'decoding' },
    })
  })
})
