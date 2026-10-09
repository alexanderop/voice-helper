import { WEEKLY_GOAL_DAYS, type DayState } from '../domain/calendar'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MS_PER_DAY = 86_400_000

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`

export function streakHeadline(current: number): string {
  return current === 0
    ? 'Start a new run today'
    : `${plural(current, 'day')} in a row`
}

export function daysOfGoal(practiced: number): string {
  return `${practiced} of ${WEEKLY_GOAL_DAYS} days`
}

/** One sentence about the weekly goal, shared by Today and Result. */
export function remainingLine(practiced: number): string {
  const remaining = WEEKLY_GOAL_DAYS - practiced
  return remaining > 0
    ? `${plural(remaining, 'more day')} by Sunday.`
    : 'Goal reached. Extra drills still count.'
}

/** A local day number as "Oct 7". The day number is a UTC date, so format it as one. */
export function shortDate(day: number, locale?: string): string {
  return new Date(day * MS_PER_DAY).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

const STATE_TEXT: Readonly<Record<DayState, string>> = {
  practiced: 'practiced',
  missed: 'not practiced',
  today: 'today, not practiced yet',
  future: 'still to come',
}

export function dayLabel(day: number, state: DayState): string {
  return `${shortDate(day)}, ${STATE_TEXT[state]}`
}
