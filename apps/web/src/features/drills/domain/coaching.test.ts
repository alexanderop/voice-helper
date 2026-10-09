import { describe, expect, it } from 'vitest'
import { analyze, type Pause } from './analysis'
import { coachingLine } from './coaching'
import type { Drill } from './drill'

function drill(
  transcript: string,
  recordedAt = 1000,
  durationMs = 60_000,
): Drill {
  return {
    id: String(recordedAt),
    kind: 'drill',
    prompt: 'Explain what an agent is.',
    recordedAt,
    durationMs,
    transcript,
    analysis: analyze(transcript, durationMs, []),
  }
}

function withPauses(
  transcript: string,
  pauses: readonly Pause[] | null,
): Drill {
  return { ...drill(transcript), analysis: analyze(transcript, 60_000, pauses) }
}

describe('coachingLine', () => {
  it('names hedges in the first three sentences', () => {
    const take = drill(
      'I think an agent is a loop. It maybe calls tools. It works. I guess that is all.',
    )
    expect(coachingLine(take, undefined)).toBe(
      'Thesis was hedged twice. Say it flat once more.',
    )
  })

  it('ignores hedges after the third sentence', () => {
    const take = drill(
      'An agent is a loop. It calls tools. It works. Maybe that is all.',
    )
    expect(coachingLine(take, undefined)).toBe(
      'No fillers counted. Try the same prompt a little slower.',
    )
  })

  it('compares the filler rate with the previous drill of the same kind', () => {
    const before = drill(
      'Um, an agent, uh, is, um, a loop, uh, with tools.',
      1000,
    )
    const now = drill('An agent, um, is a loop with tools.', 2000)
    expect(coachingLine(now, before)).toBe(
      'Fewer fillers than last time: 4 → 1 a minute. Keep that pace.',
    )
  })

  it('points out a rising filler rate', () => {
    const before = drill('An agent is a loop with tools.', 1000)
    const now = drill('Um, an agent is, uh, a loop.', 2000)
    expect(coachingLine(now, before)).toBe(
      'More fillers than last time. When you reach for "um", pause instead.',
    )
  })

  it('points out the yeah habit', () => {
    expect(
      coachingLine(drill('Yeah. It works, yeah. Tools, yeah.'), undefined),
    ).toBe('"Yeah" came up 3 times. Let a sentence end in silence instead.')
  })

  it('points out an overused habit word', () => {
    expect(
      coachingLine(
        drill(
          'An agent is basically a loop. It basically calls tools. Basically it reads, basically it writes.',
        ),
        undefined,
      ),
    ).toBe('"Basically" came up 4 times. Swap one for a pause.')
  })

  it('leaves habit words alone below the threshold', () => {
    expect(
      coachingLine(
        drill('So an agent is a loop. So it calls tools. So it works.'),
        undefined,
      ),
    ).toBe('No fillers counted. Try the same prompt a little slower.')
  })

  it('names pauses that outnumber fillers', () => {
    const pauses = [0, 3000, 6000].map((startMs) => ({
      startMs,
      durationMs: 1500,
    }))
    expect(
      coachingLine(
        withPauses('An agent, um, is a loop with tools.', pauses),
        undefined,
      ),
    ).toBe('You paused 3 times and filled a gap once. Silence is working.')
  })

  it('stays quiet about pauses when fillers keep up or pauses are unknown', () => {
    const take = 'An agent, um, is a loop with tools.'
    const onePause = [{ startMs: 0, durationMs: 1500 }]
    const fallback =
      'One thought, spoken out loud. That is the practice. Come back tomorrow.'
    expect([
      coachingLine(withPauses(take, onePause), undefined),
      coachingLine(withPauses(take, null), undefined),
    ]).toEqual([fallback, fallback])
  })

  it('falls back to an encouraging line', () => {
    expect(coachingLine(drill('An agent, um, is a loop.'), undefined)).toBe(
      'One thought, spoken out loud. That is the practice. Come back tomorrow.',
    )
  })
})
