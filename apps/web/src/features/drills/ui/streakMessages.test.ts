import { describe, expect, it } from 'vitest'
import {
  dayLabel,
  daysOfGoal,
  remainingLine,
  shortDate,
  streakHeadline,
} from './streakMessages'

describe('streak copy', () => {
  it('counts days in a row and starts calmly from zero', () => {
    expect(streakHeadline(1)).toBe('1 day in a row')
    expect(streakHeadline(3)).toBe('3 days in a row')
    expect(streakHeadline(0)).toBe('Start a new run today')
  })

  it('shows progress toward the weekly goal', () => {
    expect(daysOfGoal(3)).toBe('3 of 5 days')
  })

  it('says how many days are left in the week', () => {
    expect(remainingLine(0)).toBe('5 more days by Sunday.')
    expect(remainingLine(4)).toBe('1 more day by Sunday.')
    expect(remainingLine(5)).toBe('Goal reached. Extra drills still count.')
    expect(remainingLine(7)).toBe('Goal reached. Extra drills still count.')
  })

  it('formats a local day number without shifting it by the time zone', () => {
    expect(shortDate(20731, 'en-US')).toBe('Oct 5')
    expect(shortDate(20703, 'en-US')).toBe('Sep 7')
  })

  it('labels a day with its state', () => {
    expect(dayLabel(20732, 'practiced')).toMatch(/, practiced$/)
    expect(dayLabel(20733, 'today')).toMatch(/, today, not practiced yet$/)
    expect(dayLabel(20734, 'future')).toMatch(/, still to come$/)
  })
})
