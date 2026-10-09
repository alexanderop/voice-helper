import { describe, expect, it } from 'vitest'
import { justPracticed, practiceCalendar, type DayState } from './calendar'
import type { DrillKind } from './drill'
import { drill } from './fixtures'

const at = (month: number, date: number, [hour, minute] = [9, 0]) =>
  new Date(2026, month - 1, date, hour, minute).getTime()

const spoken = (timestamp: number, kind: DrillKind = 'drill') =>
  drill(kind, timestamp, 'One.')

const NOW = at(10, 7, [12, 0])

const thisWeek = (drills: ReturnType<typeof spoken>[]) =>
  practiceCalendar(drills, NOW).weeks.at(-1)

const states = (days: readonly { state: DayState }[] | undefined) =>
  days?.map((day) => day.state)

describe('practiceCalendar', () => {
  it('starts empty for a new user', () => {
    const calendar = practiceCalendar([], NOW)
    expect(calendar.current).toBe(0)
    expect(calendar.best).toBe(0)
    expect(calendar.weeks.map((week) => week.monday)).toEqual([
      20703, 20710, 20717, 20724, 20731,
    ])
    expect(states(calendar.weeks.at(-1)?.days)).toEqual([
      'missed',
      'missed',
      'today',
      'future',
      'future',
      'future',
      'future',
    ])
  })

  it('counts consecutive days back from today', () => {
    const calendar = practiceCalendar(
      [spoken(at(10, 7)), spoken(at(10, 6)), spoken(at(10, 5))],
      NOW,
    )
    expect(calendar.current).toBe(3)
    expect(calendar.best).toBe(3)
    expect(states(calendar.weeks.at(-1)?.days)).toEqual([
      'practiced',
      'practiced',
      'practiced',
      'future',
      'future',
      'future',
      'future',
    ])
  })

  it('counts from yesterday while today is still open', () => {
    const calendar = practiceCalendar([spoken(at(10, 6))], NOW)
    expect(calendar.current).toBe(1)
    expect(calendar.weeks.at(-1)?.days[2]).toEqual({
      day: 20733,
      state: 'today',
    })
  })

  it('reports no current run when neither today nor yesterday is practiced', () => {
    const calendar = practiceCalendar([spoken(at(10, 5))], NOW)
    expect(calendar.current).toBe(0)
    expect(calendar.best).toBe(1)
  })

  it('keeps the longest old run as best after a gap', () => {
    const calendar = practiceCalendar(
      [
        spoken(at(10, 1)),
        spoken(at(10, 2)),
        spoken(at(10, 3)),
        spoken(at(10, 6)),
        spoken(at(10, 7)),
      ],
      NOW,
    )
    expect(calendar.current).toBe(2)
    expect(calendar.best).toBe(3)
  })

  it('ignores imported talks', () => {
    const calendar = practiceCalendar(
      [spoken(at(10, 7), 'import'), spoken(at(10, 6), 'import')],
      NOW,
    )
    expect(calendar.current).toBe(0)
    expect(calendar.best).toBe(0)
    expect(thisWeek([spoken(at(10, 7), 'import')])?.practiced).toBe(0)
  })

  it('counts a day once however many drills it holds', () => {
    const week = thisWeek([
      spoken(at(10, 6, [8, 0])),
      spoken(at(10, 6, [13, 0]), 'opening'),
      spoken(at(10, 6, [20, 0]), 'closing'),
    ])
    expect(week?.practiced).toBe(1)
    expect(
      practiceCalendar([spoken(at(10, 6, [8, 0]), 'drill')], NOW).best,
    ).toBe(1)
  })

  it('puts a Sunday drill in the week that started the Monday before', () => {
    const calendar = practiceCalendar([spoken(at(10, 4))], NOW)
    const [previous, current] = calendar.weeks.slice(-2)
    expect(previous?.monday).toBe(20724)
    expect(previous?.days[6]).toEqual({ day: 20730, state: 'practiced' })
    expect(previous?.practiced).toBe(1)
    expect(current?.practiced).toBe(0)
  })

  it('counts a drill at 23:30 for that day and one just after midnight for the next', () => {
    const calendar = practiceCalendar(
      [spoken(at(10, 5, [23, 30])), spoken(at(10, 6, [0, 10]))],
      NOW,
    )
    expect(calendar.current).toBe(2)
    expect(calendar.best).toBe(2)
    expect(states(calendar.weeks.at(-1)?.days)?.slice(0, 3)).toEqual([
      'practiced',
      'practiced',
      'today',
    ])
  })

  it('counts practiced days per week, oldest week first', () => {
    const calendar = practiceCalendar(
      [spoken(at(9, 8)), spoken(at(9, 9)), spoken(at(10, 7))],
      NOW,
    )
    expect(calendar.weeks.map((week) => week.practiced)).toEqual([
      2, 0, 0, 0, 1,
    ])
  })

  it('shows as many weeks as asked for', () => {
    expect(
      practiceCalendar([], NOW, 2).weeks.map((week) => week.monday),
    ).toEqual([20724, 20731])
  })
})

describe('justPracticed', () => {
  const earlier = spoken(at(10, 6))
  const latest = spoken(at(10, 7, [8, 0]))

  it('is true for the newest spoken drill recorded today', () => {
    expect(justPracticed([latest, earlier], latest, NOW)).toBe(true)
  })

  it('is false for an older drill', () => {
    expect(justPracticed([latest, earlier], earlier, NOW)).toBe(false)
  })

  it('is false when the newest drill is from an earlier day', () => {
    expect(justPracticed([earlier], earlier, NOW)).toBe(false)
  })

  it('is false for an import even when it is the newest', () => {
    const talk = spoken(at(10, 7, [11, 0]), 'import')
    expect(justPracticed([talk, latest], talk, NOW)).toBe(false)
  })
})
