import { describe, expect, it } from 'vitest'
import { analyze, findMarks } from './analysis'

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
