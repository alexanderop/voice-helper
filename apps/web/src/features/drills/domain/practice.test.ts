import { describe, expect, it } from 'vitest'
import { analyze } from './analysis'
import type { Drill, DrillKind } from './drill'
import {
  daysPracticed,
  fillerTrend,
  importedTalks,
  promptFor,
} from './practice'

function drill(kind: DrillKind, recordedAt: number, transcript: string): Drill {
  return timed(kind, recordedAt, [transcript, 60_000])
}

function timed(
  kind: DrillKind,
  recordedAt: number,
  [transcript, durationMs]: readonly [string, number | null],
): Drill {
  return {
    id: `${kind}-${recordedAt}`,
    kind,
    prompt:
      kind === 'import' ? 'Vue.js Talks #16' : 'Explain what an agent is.',
    recordedAt,
    durationMs,
    transcript,
    analysis: analyze(transcript, durationMs, []),
  }
}

const day = (date: string, time = '09:00') =>
  new Date(`${date}T${time}`).getTime()

describe('practice', () => {
  it('counts distinct local days with a spoken drill and ignores imports', () => {
    const drills = [
      drill('drill', day('2026-10-06'), 'One.'),
      drill('opening', day('2026-10-06', '21:00'), 'Two.'),
      drill('closing', day('2026-10-08'), 'Three.'),
      drill('import', day('2026-10-07'), 'Four.'),
    ]
    expect(daysPracticed(drills)).toBe(2)
  })

  it('charts filler counts oldest first without imports', () => {
    const drills = [
      drill('drill', 3, 'Um, yeah.'),
      drill('import', 2, 'Um um um.'),
      drill('opening', 1, 'Uh, so yeah, um.'),
    ]
    expect(
      fillerTrend(drills).map((point) => [point.id, point.fillers]),
    ).toEqual([
      ['opening-1', 3],
      ['drill-3', 2],
    ])
  })

  it('lists imported talks with fillers per minute', () => {
    const drills = [
      timed('import', 1, ['Um, yeah, um, so it works.', 120_000]),
      timed('import', 2, ['Um.', null]),
    ]
    expect(importedTalks(drills)).toEqual([
      {
        id: 'import-2',
        name: 'Vue.js Talks #16',
        durationMs: null,
        fillers: 1,
        perMinute: null,
      },
      {
        id: 'import-1',
        name: 'Vue.js Talks #16',
        durationMs: 120_000,
        fillers: 3,
        perMinute: 1.5,
      },
    ])
  })

  it('rotates the daily prompt and keeps it stable within a day', () => {
    const morning = promptFor('drill', day('2026-10-08', '07:00'))
    expect(promptFor('drill', day('2026-10-08', '23:00'))).toEqual(morning)
    expect(promptFor('drill', day('2026-10-09')).number).toBe(
      (morning.number % 12) + 1,
    )
    expect(promptFor('opening', day('2026-10-08')).prompt).toBe(
      'Open your talk. Say your first 30 seconds.',
    )
  })
})
