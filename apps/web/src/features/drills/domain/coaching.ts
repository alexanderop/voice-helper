import {
  fillerCount,
  fillersPerMinute,
  findMarks,
  overusedHabitWord,
  type Mark,
} from './analysis'
import type { Drill } from './drill'

type CoachingContext = {
  readonly drill: Drill
  readonly marks: readonly Mark[]
  readonly previous: Drill | undefined
}

type CoachingRule = {
  readonly id: string
  readonly line: (context: CoachingContext) => string | undefined
}

const times = (count: number) =>
  ['once', 'twice'][count - 1] ?? `${count} times`

/** Character offset where the third sentence ends, or the whole text. */
function openingEnd(transcript: string): number {
  const ends = Array.from(
    transcript.matchAll(/[.!?]+(?=\s|$)/g),
    (match) => match.index + match[0].length,
  )
  return ends[2] ?? transcript.length
}

function rateChange({ drill, previous }: CoachingContext) {
  if (!previous) return undefined
  const now = fillersPerMinute(drill.analysis, drill.durationMs)
  const before = fillersPerMinute(previous.analysis, previous.durationMs)
  if (now === null || before === null) return undefined
  return { now, before }
}

/** Evaluated in order. The first rule that returns a line wins. */
const COACHING_RULES: readonly CoachingRule[] = [
  {
    id: 'hedged-thesis',
    line: ({ drill, marks }) => {
      const end = openingEnd(drill.transcript)
      const hedges = marks.filter(
        (mark) => mark.category === 'hedge' && mark.start < end,
      ).length
      if (hedges === 0) return undefined
      return `Thesis was hedged ${times(hedges)}. Say it flat once more.`
    },
  },
  {
    id: 'fewer-fillers',
    line: (context) => {
      const change = rateChange(context)
      if (!change || change.now >= change.before * 0.8) return undefined
      return `Fewer fillers than last time: ${change.before} → ${change.now} a minute. Keep that pace.`
    },
  },
  {
    id: 'more-fillers',
    line: (context) => {
      const change = rateChange(context)
      if (!change || change.now <= change.before * 1.2) return undefined
      return 'More fillers than last time. When you reach for "um", pause instead.'
    },
  },
  {
    id: 'yeah-habit',
    line: ({ drill }) => {
      const yeah = drill.analysis.groups.yeah
      if (yeah < 3) return undefined
      return `"Yeah" came up ${yeah} times. Let a sentence end in silence instead.`
    },
  },
  {
    id: 'habit-word',
    line: ({ drill }) => {
      const habit = overusedHabitWord(drill.transcript)
      if (!habit) return undefined
      const word = habit.term.charAt(0).toUpperCase() + habit.term.slice(1)
      return `"${word}" came up ${habit.count} times. Swap one for a pause.`
    },
  },
  {
    id: 'silence-working',
    line: ({ drill }) => {
      const pauses = drill.analysis.pauseCount
      const fillers = fillerCount(drill.analysis)
      if (pauses === null || fillers === 0 || pauses <= fillers)
        return undefined
      return `You paused ${times(pauses)} and filled a gap ${times(fillers)}. Silence is working.`
    },
  },
  {
    id: 'clean-take',
    line: ({ drill }) => {
      if (fillerCount(drill.analysis) > 0) return undefined
      return 'No fillers counted. Try the same prompt a little slower.'
    },
  },
  {
    id: 'keep-going',
    line: () =>
      'One thought, spoken out loud. That is the practice. Come back tomorrow.',
  },
]

export function coachingLine(
  drill: Drill,
  previous: Drill | undefined,
): string {
  const context = { drill, previous, marks: findMarks(drill.transcript) }
  for (const rule of COACHING_RULES) {
    const line = rule.line(context)
    if (line) return line
  }
  return ''
}
