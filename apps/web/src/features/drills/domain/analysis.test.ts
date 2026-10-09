import { describe, expect, it } from 'vitest'
import { analyze, findMarks, overusedHabitWord } from './analysis'

describe('analyze', () => {
  it('counts the research filler prompt by term and group', () => {
    const transcript =
      "So, um, I think we, uh, should go. Um, yeah, and, uh, that's why, um, it works."
    expect(analyze(transcript, 30_000, [])).toEqual({
      wordCount: 17,
      wordsPerMinute: 34,
      pauseCount: 0,
      groups: { yeah: 1, um: 5, hedge: 1 },
      terms: { um: 3, uh: 2, 'i think': 1, yeah: 1 },
    })
  })

  it('matches multi-word phrases before single words', () => {
    expect(
      analyze('It works. And yeah, so yeah. Yeah.', 60_000, []).terms,
    ).toEqual({
      'and yeah': 1,
      'so yeah': 1,
      yeah: 1,
    })
  })

  it('normalizes drawn-out spellings', () => {
    expect(analyze('Ummm, uhh, uhm, hmmm, yeahhh.', 60_000, []).terms).toEqual({
      um: 2,
      uh: 1,
      hmm: 1,
      yeah: 1,
    })
  })

  it('skips "kind of" after a determiner but counts it as a hedge otherwise', () => {
    expect(
      analyze('What kind of model is it? It is kind of slow.', 60_000, [])
        .terms,
    ).toEqual({
      'kind of': 1,
    })
  })

  it('counts "you know" as a filler, but not after a question or clause word', () => {
    expect(
      analyze(
        'You know, it is a loop. Do you know why? If you know tools, I will let you know.',
        60_000,
        [],
      ).terms,
    ).toEqual({ 'you know': 1 })
  })

  it('counts vague tails and "I don\'t know" as hedges', () => {
    const result = analyze(
      "It calls a tool or something. Logs and stuff, or whatever. I don't know.",
      60_000,
      [],
    )
    expect([result.groups, result.terms]).toEqual([
      { yeah: 0, um: 0, hedge: 4 },
      {
        'or something': 1,
        'and stuff': 1,
        'or whatever': 1,
        "i don't know": 1,
      },
    ])
  })

  it('does not count habit words', () => {
    expect(
      analyze('So basically it is like, just, really right.', 60_000, [])
        .groups,
    ).toEqual({ yeah: 0, um: 0, hedge: 0 })
  })

  it('counts only pauses of at least one second', () => {
    const pauses = [
      { startMs: 0, durationMs: 999 },
      { startMs: 2000, durationMs: 1000 },
      { startMs: 5000, durationMs: 2400 },
    ]
    expect(analyze('One two three.', 60_000, pauses).pauseCount).toBe(2)
  })

  it('reports unknown pace and pauses as null for untimed text', () => {
    const result = analyze('Maybe this works.', null, null)
    expect([
      result.wordsPerMinute,
      result.pauseCount,
      result.groups.hedge,
    ]).toEqual([null, null, 1])
  })
})

describe('findMarks', () => {
  it('locates each mark by character offsets', () => {
    const transcript = 'Well, I think maybe. And yeah.'
    expect(
      findMarks(transcript).map((mark) => [
        transcript.slice(mark.start, mark.end),
        mark.category,
      ]),
    ).toEqual([
      ['I think', 'hedge'],
      ['maybe', 'hedge'],
      ['And yeah', 'filler'],
    ])
  })
})

describe('overusedHabitWord', () => {
  const plain = (count: number) => ' The agent calls a tool.'.repeat(count)

  it('names the most used habit word once it crosses both thresholds', () => {
    expect(
      overusedHabitWord(
        `Basically, it is a loop. It basically calls tools, basically. So basically, so it works.${plain(10)}`,
      ),
    ).toEqual({ term: 'basically', count: 4 })
  })

  it('needs at least four uses', () => {
    expect(
      overusedHabitWord('Really, it is really a loop. Really fast.'),
    ).toBeUndefined()
  })

  it('needs the word to be at least 2% of the transcript', () => {
    expect(
      overusedHabitWord(`Just, just, just, just.${plain(40)}`),
    ).toBeUndefined()
  })

  it('counts multi-word habits and the OK spelling', () => {
    expect([
      overusedHabitWord('I mean, I mean it. I mean, I mean, a loop.'),
      overusedHabitWord('OK, okay, ok, Okay.'),
    ]).toEqual([
      { term: 'i mean', count: 4 },
      { term: 'okay', count: 4 },
    ])
  })

  it('skips words already inside a counted phrase', () => {
    expect(
      overusedHabitWord(
        'So yeah. So yeah. So yeah. So yeah. I feel like, I feel like it.',
      ),
    ).toBeUndefined()
  })
})
