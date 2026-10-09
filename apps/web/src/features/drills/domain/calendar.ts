import type { Drill } from './drill'

export const WEEKLY_GOAL_DAYS = 5

const MS_PER_DAY = 86_400_000

export type DayState = 'practiced' | 'missed' | 'today' | 'future'
type CalendarDay = { readonly day: number; readonly state: DayState }
type CalendarWeek = {
  readonly monday: number
  readonly days: readonly CalendarDay[]
  readonly practiced: number
}
export type PracticeCalendar = {
  readonly current: number
  readonly best: number
  readonly weeks: readonly CalendarWeek[]
}

/** Local calendar day as a day count, so a drill at 23:30 counts for that evening and DST never skews day arithmetic. */
export function dayNumber(timestamp: number): number {
  const date = new Date(timestamp)
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  )
}

/** Day 0 (1970-01-01) is a Thursday. */
function mondayOf(day: number): number {
  return day - ((day + 3) % 7)
}

function longestRun(days: ReadonlySet<number>): number {
  let best = 0
  for (const day of days) {
    if (days.has(day - 1)) continue
    let length = 1
    while (days.has(day + length)) length++
    best = Math.max(best, length)
  }
  return best
}

/**
 * Practice days are local calendar days with a spoken drill. The current run
 * counts back from yesterday until today is practiced, so it never looks
 * broken before the day is over. Weeks start on Monday.
 */
export function practiceCalendar(
  drills: readonly Drill[],
  now: number,
  weekCount = 5,
): PracticeCalendar {
  const practiced = new Set(
    drills
      .filter((drill) => drill.kind !== 'import')
      .map((drill) => dayNumber(drill.recordedAt)),
  )
  const today = dayNumber(now)

  let current = 0
  for (
    let day = practiced.has(today) ? today : today - 1;
    practiced.has(day);
    day--
  )
    current++

  const stateOf = (day: number): DayState => {
    if (practiced.has(day)) return 'practiced'
    if (day === today) return 'today'
    return day > today ? 'future' : 'missed'
  }
  const weeks = Array.from({ length: weekCount }, (_week, index) => {
    const monday = mondayOf(today) - 7 * (weekCount - 1 - index)
    const days = Array.from({ length: 7 }, (_day, offset) => ({
      day: monday + offset,
      state: stateOf(monday + offset),
    }))
    return {
      monday,
      days,
      practiced: days.filter((day) => day.state === 'practiced').length,
    }
  })

  return { current, best: longestRun(practiced), weeks }
}

/** True when `drill` is the newest spoken drill and was recorded today. */
export function justPracticed(
  drills: readonly Drill[],
  drill: Drill,
  now: number,
): boolean {
  const newest = drills
    .filter((other) => other.kind !== 'import')
    .reduce<Drill | undefined>(
      (latest, other) =>
        latest && latest.recordedAt >= other.recordedAt ? latest : other,
      undefined,
    )
  return (
    newest?.id === drill.id && dayNumber(drill.recordedAt) === dayNumber(now)
  )
}
