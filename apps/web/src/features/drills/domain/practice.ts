import { fillerCount, fillersPerMinute } from './analysis'
import type { Drill, DrillKind } from './drill'

const PROMPTS: readonly string[] = [
  'Explain what an agent is.',
  'Describe the last bug that surprised you.',
  'Argue for one tool your team should drop.',
  'Explain a feature you built to a new colleague.',
  'Teach the one idea your talk depends on.',
  'Describe a trade-off you made this month.',
  'Pitch your next talk in two minutes.',
  'Explain why tests sometimes lie.',
  'Describe how a web page reaches the screen.',
  'Make the case for deleting code.',
  'Explain what changed your mind recently.',
  'Describe a good code review.',
]

const OPENING_PROMPT = 'Open your talk. Say your first 30 seconds.'
const CLOSING_PROMPT = 'Close your talk. Say your last 30 seconds.'

/** Local calendar day, so a drill at 23:30 counts for that evening. */
function dayKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayNumber(timestamp: number): number {
  const date = new Date(timestamp)
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  )
}

/** The prompt rotates once a day, the same for every drill that day. */
export function promptFor(
  kind: Exclude<DrillKind, 'import'>,
  now: number,
): { prompt: string; number: number } {
  if (kind === 'opening') return { prompt: OPENING_PROMPT, number: 0 }
  if (kind === 'closing') return { prompt: CLOSING_PROMPT, number: 0 }
  const index = dayNumber(now) % PROMPTS.length
  return { prompt: PROMPTS[index] ?? PROMPTS[0] ?? '', number: index + 1 }
}

/**
 * Days with at least one spoken drill. It only counts up, so a missed day
 * never takes anything away.
 */
export function daysPracticed(drills: readonly Drill[]): number {
  return new Set(
    drills
      .filter((drill) => drill.kind !== 'import')
      .map((drill) => dayKey(drill.recordedAt)),
  ).size
}

export type TrendPoint = {
  readonly id: string
  readonly recordedAt: number
  readonly fillers: number
}

/** Oldest first, the last `limit` spoken drills, for the progress chart. */
export function fillerTrend(
  drills: readonly Drill[],
  limit = 12,
): TrendPoint[] {
  return drills
    .filter((drill) => drill.kind !== 'import')
    .toSorted((a, b) => a.recordedAt - b.recordedAt)
    .slice(-limit)
    .map((drill) => ({
      id: drill.id,
      recordedAt: drill.recordedAt,
      fillers: fillerCount(drill.analysis),
    }))
}

export type ImportedTalk = {
  readonly id: string
  readonly name: string
  readonly durationMs: number | null
  readonly fillers: number
  readonly perMinute: number | null
}

export function importedTalks(drills: readonly Drill[]): ImportedTalk[] {
  return drills
    .filter((drill) => drill.kind === 'import')
    .toSorted((a, b) => b.recordedAt - a.recordedAt)
    .map((drill) => ({
      id: drill.id,
      name: drill.prompt,
      durationMs: drill.durationMs,
      fillers: fillerCount(drill.analysis),
      perMinute: fillersPerMinute(drill.analysis, drill.durationMs),
    }))
}
