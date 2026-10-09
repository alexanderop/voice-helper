import { describe, expect, it } from 'vitest'
import { drill, timed } from './fixtures'
import { fillerTrend, importedTalks, promptFor } from './practice'

const day = (date: string, time = '09:00') =>
  new Date(`${date}T${time}`).getTime()

describe('practice', () => {
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
