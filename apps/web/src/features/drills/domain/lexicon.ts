/**
 * Every phrase Talk Coach counts lives in this table.
 *
 * Fillers are sounds or words that fill silence: "um", "uh", "you know", and
 * the "yeah" habit the research transcripts showed about 150 times per talk.
 * Hedges soften a claim the speaker could state flat, including the vague
 * tails "or something", "and stuff", and "or whatever".
 *
 * A word joins the table only when most of its uses are fillers or hedges.
 * "Kind of" and "sort of" are skipped after a determiner ("what kind of
 * model"), and "you know" after a word that makes it a question or a clause
 * ("do you know", "if you know"), because those uses are content.
 *
 * Habit words are different: "like", "so", "just", "actually", and the rest
 * of `HABIT_WORDS` are content words far more often than fillers, so no single
 * use is marked or counted. Only overuse is a signal, and the coaching reads
 * it from the transcript.
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

/** "Do you know", "if you know", "let you know" ask or state, not fill. */
const knowAsContent = [
  'do',
  'does',
  'did',
  "don't",
  "doesn't",
  "didn't",
  'if',
  'what',
  'how',
  'who',
  'why',
  'where',
  'when',
  'whether',
  'would',
  'could',
  'should',
  'will',
  'can',
  'might',
  'to',
  'as',
  'than',
  'that',
  'let',
  'sure',
  'you',
]

export const LEXICON: readonly LexiconEntry[] = [
  { term: 'and yeah', group: 'yeah' },
  { term: 'so yeah', group: 'yeah' },
  { term: 'yeah', group: 'yeah' },
  { term: 'um', group: 'um' },
  { term: 'you know', group: 'um', notAfter: knowAsContent },
  { term: 'uh', group: 'um' },
  { term: 'er', group: 'um' },
  { term: 'ah', group: 'um' },
  { term: 'hmm', group: 'um' },
  { term: 'i think', group: 'hedge' },
  { term: 'i guess', group: 'hedge' },
  { term: 'i feel like', group: 'hedge' },
  { term: "i don't know", group: 'hedge' },
  { term: 'kind of', group: 'hedge', notAfter: determiners },
  { term: 'sort of', group: 'hedge', notAfter: determiners },
  { term: 'maybe', group: 'hedge' },
  { term: 'probably', group: 'hedge' },
  { term: 'perhaps', group: 'hedge' },
  { term: 'or something', group: 'hedge' },
  { term: 'and stuff', group: 'hedge' },
  { term: 'or whatever', group: 'hedge' },
]

/**
 * Not counted per use. The coaching names one of these only when it fills at
 * least `HABIT_MIN_SHARE` of the words and comes up `HABIT_MIN_COUNT` times.
 * Words inside a counted phrase ("so yeah", "I feel like") do not count again.
 */
export const HABIT_WORDS: readonly string[] = [
  'like',
  'so',
  'just',
  'actually',
  'basically',
  'literally',
  'honestly',
  'really',
  'right',
  'okay',
  'i mean',
]

export const CATEGORY_OF_GROUP: Readonly<Record<MarkGroup, MarkCategory>> = {
  yeah: 'filler',
  um: 'filler',
  hedge: 'hedge',
}

/**
 * Whisper spells drawn-out sounds with repeated letters: "ummm", "uhh", "uhm",
 * and sometimes writes "okay" as "OK".
 */
const SPELLINGS: readonly (readonly [RegExp, string])[] = [
  [/^u+h*m+$/, 'um'],
  [/^u+h+$/, 'uh'],
  [/^e+r+m*$/, 'er'],
  [/^a+h+$/, 'ah'],
  [/^h+m+$/, 'hmm'],
  [/^y+e+a+h+$/, 'yeah'],
  [/^ok(a+y+)?$/, 'okay'],
]

export function normalizeWord(word: string): string {
  const lower = word.toLowerCase().replace(/^'+|'+$/g, '')
  return SPELLINGS.find(([pattern]) => pattern.test(lower))?.[1] ?? lower
}
