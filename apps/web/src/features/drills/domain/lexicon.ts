/**
 * Every phrase Talk Coach counts lives in this table.
 *
 * Fillers are sounds or words that fill silence: "um", "uh", and the "yeah"
 * habit the research transcripts showed about 150 times per talk.
 * Hedges soften a claim the speaker could state flat.
 *
 * Left out on purpose, because they are content words far more often than
 * fillers in a transcript: "like", "just", "actually", "basically", "right",
 * "you know", "so". "Kind of" and "sort of" are skipped after a determiner
 * ("what kind of model") because that use is not a hedge.
 */
export type MarkGroup = 'yeah' | 'um' | 'hedge'
export type MarkCategory = 'filler' | 'hedge'

type LexiconEntry = {
  readonly term: string
  readonly group: MarkGroup
  readonly notAfter?: readonly string[]
}

const determiners = [
  'a',
  'what',
  'this',
  'that',
  'the',
  'any',
  'some',
  'every',
  'which',
  'one',
  'same',
]

export const LEXICON: readonly LexiconEntry[] = [
  { term: 'and yeah', group: 'yeah' },
  { term: 'so yeah', group: 'yeah' },
  { term: 'yeah', group: 'yeah' },
  { term: 'um', group: 'um' },
  { term: 'uh', group: 'um' },
  { term: 'er', group: 'um' },
  { term: 'ah', group: 'um' },
  { term: 'hmm', group: 'um' },
  { term: 'i think', group: 'hedge' },
  { term: 'i guess', group: 'hedge' },
  { term: 'i feel like', group: 'hedge' },
  { term: 'kind of', group: 'hedge', notAfter: determiners },
  { term: 'sort of', group: 'hedge', notAfter: determiners },
  { term: 'maybe', group: 'hedge' },
  { term: 'probably', group: 'hedge' },
  { term: 'perhaps', group: 'hedge' },
]

export const CATEGORY_OF_GROUP: Readonly<Record<MarkGroup, MarkCategory>> = {
  yeah: 'filler',
  um: 'filler',
  hedge: 'hedge',
}

/** Whisper spells drawn-out sounds with repeated letters: "ummm", "uhh", "uhm". */
const SPELLINGS: readonly (readonly [RegExp, string])[] = [
  [/^u+h*m+$/, 'um'],
  [/^u+h+$/, 'uh'],
  [/^e+r+m*$/, 'er'],
  [/^a+h+$/, 'ah'],
  [/^h+m+$/, 'hmm'],
  [/^y+e+a+h+$/, 'yeah'],
]

export function normalizeWord(word: string): string {
  const lower = word.toLowerCase().replace(/^'+|'+$/g, '')
  return SPELLINGS.find(([pattern]) => pattern.test(lower))?.[1] ?? lower
}
