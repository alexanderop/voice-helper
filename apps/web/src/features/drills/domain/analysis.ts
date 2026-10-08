import * as v from 'valibot'
import {
  CATEGORY_OF_GROUP,
  LEXICON,
  normalizeWord,
  type MarkCategory,
  type MarkGroup,
} from './lexicon'

export type Pause = { readonly startMs: number; readonly durationMs: number }

/** A counted phrase, located by character offsets in the transcript. */
export type Mark = {
  readonly term: string
  readonly group: MarkGroup
  readonly category: MarkCategory
  readonly start: number
  readonly end: number
}

export const PAUSE_MIN_MS = 1000

const count = v.pipe(v.number(), v.integer(), v.minValue(0))
export const analysisSchema = v.object({
  wordCount: count,
  wordsPerMinute: v.nullable(count),
  pauseCount: v.nullable(count),
  groups: v.object({ yeah: count, um: count, hedge: count }),
  terms: v.record(v.string(), count),
})
export type Analysis = v.InferOutput<typeof analysisSchema>

type Word = {
  readonly norm: string
  readonly start: number
  readonly end: number
}

function words(transcript: string): Word[] {
  return Array.from(
    transcript.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)*/g),
    (match) => ({
      norm: normalizeWord(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    }),
  )
}

const ENTRIES = LEXICON.map((entry) => ({
  ...entry,
  parts: entry.term.split(' '),
})).toSorted((a, b) => b.parts.length - a.parts.length)

function matchAt(list: readonly Word[], index: number) {
  const previous = list[index - 1]?.norm
  return ENTRIES.find(
    (entry) =>
      entry.parts.every(
        (part, offset) => list[index + offset]?.norm === part,
      ) && !(previous !== undefined && entry.notAfter?.includes(previous)),
  )
}

/** Multi-word phrases win over single words: "and yeah" is one mark, not "yeah". */
export function findMarks(transcript: string): Mark[] {
  const list = words(transcript)
  const marks: Mark[] = []
  let index = 0
  while (index < list.length) {
    const entry = matchAt(list, index)
    const first = list[index]
    const last = list[index + (entry?.parts.length ?? 1) - 1]
    if (entry && first && last)
      marks.push({
        term: entry.term,
        group: entry.group,
        category: CATEGORY_OF_GROUP[entry.group],
        start: first.start,
        end: last.end,
      })
    index += entry?.parts.length ?? 1
  }
  return marks
}

/**
 * `durationMs` is null for text captions without timing, and `pauses` is null
 * when no audio was analyzed. Either one leaves its measurement unknown
 * instead of reporting zero.
 */
export function analyze(
  transcript: string,
  durationMs: number | null,
  pauses: readonly Pause[] | null,
): Analysis {
  const wordCount = words(transcript).length
  const groups = { yeah: 0, um: 0, hedge: 0 }
  const terms: Record<string, number> = {}
  for (const mark of findMarks(transcript)) {
    groups[mark.group] += 1
    terms[mark.term] = (terms[mark.term] ?? 0) + 1
  }
  return {
    wordCount,
    wordsPerMinute: durationMs
      ? Math.round(wordCount / (durationMs / 60_000))
      : null,
    pauseCount: pauses
      ? pauses.filter((pause) => pause.durationMs >= PAUSE_MIN_MS).length
      : null,
    groups,
    terms,
  }
}

export function fillerCount(analysis: Analysis): number {
  return analysis.groups.yeah + analysis.groups.um
}

export function fillersPerMinute(
  analysis: Analysis,
  durationMs: number | null,
): number | null {
  if (!durationMs) return null
  return Math.round((fillerCount(analysis) / (durationMs / 60_000)) * 10) / 10
}
