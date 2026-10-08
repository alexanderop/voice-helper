import { assert, describe, expect, it } from 'vitest'
import { Result } from '@talk-coach/result'
import type { Drill } from '../domain/drill'
import type { ProcessingStage } from '../domain/session'
import { createDrillService } from './createDrillService'

function value<T>(result: Result<T, unknown>): T {
  assert(result.isOk(), 'expected an ok result')
  return result.value
}

function failure<E>(result: Result<unknown, E>): E {
  assert(result.isErr(), 'expected an error result')
  return result.error
}

function setup(transcript: string, seconds: number) {
  const stored: Drill[] = []
  const stages: ProcessingStage[] = []
  const tone = Float32Array.from({ length: seconds * 16_000 }, (_, index) =>
    index % 2 ? 0.3 : -0.3,
  )
  const service = createDrillService({
    repository: {
      list: async () => Result.ok([...stored]),
      add: async (drill) => {
        stored.push(drill)
        return Result.ok(undefined)
      },
      clear: async () => {
        stored.length = 0
        return Result.ok(undefined)
      },
    },
    decoder: { decode: async () => Result.ok(tone) },
    transcriber: {
      transcribe: async (_audio, onChunk) => {
        onChunk(1, 2)
        onChunk(2, 2)
        return Result.ok(transcript)
      },
    },
    now: () => 1_700_000_000_000,
    newId: () => 'drill-1',
  })
  const request = {
    kind: 'drill' as const,
    prompt: 'Explain what an agent is.',
    audio: new Blob(['audio']),
    onStage: (stage: ProcessingStage) => stages.push(stage),
  }
  return { service, stored, stages, request }
}

describe('createDrillService', () => {
  it('transcribes, analyzes, and saves a recording', async () => {
    const { service, stored, stages, request } = setup(
      'Um, an agent is, yeah, a loop.',
      45,
    )
    const result = await service.analyzeAudio(request)
    expect(value(result)).toEqual({
      id: 'drill-1',
      kind: 'drill',
      prompt: 'Explain what an agent is.',
      recordedAt: 1_700_000_000_000,
      durationMs: 45_000,
      transcript: 'Um, an agent is, yeah, a loop.',
      analysis: {
        wordCount: 7,
        wordsPerMinute: 9,
        pauseCount: 0,
        groups: { yeah: 1, um: 1, hedge: 0 },
        terms: { um: 1, yeah: 1 },
      },
    })
    expect(stored.map((drill) => drill.id)).toEqual(['drill-1'])
    expect(stages).toEqual([
      { step: 'transcribing', chunk: 0, chunks: 2 },
      { step: 'transcribing', chunk: 1, chunks: 2 },
      { step: 'transcribing', chunk: 2, chunks: 2 },
      { step: 'saving' },
    ])
  })

  it('rejects a clip shorter than two seconds without saving', async () => {
    const { service, stored, request } = setup('Hello there friend.', 1)
    const result = await service.analyzeAudio(request)
    expect(failure(result)).toBe('too-short')
    expect(stored).toHaveLength(0)
  })

  it('rejects a recording with almost no words', async () => {
    const { service, request } = setup('Um.', 10)
    const result = await service.analyzeAudio(request)
    expect(failure(result)).toBe('too-short')
  })

  it('imports captions as a talk without pause data', async () => {
    const { service } = setup('', 0)
    const result = await service.importCaptions(
      'Vue.js Talks #16.vtt',
      'WEBVTT\n\n00:00:00.000 --> 00:02:00.000\nSo yeah, I think it um works.',
    )
    expect(value(result).analysis).toEqual({
      wordCount: 7,
      wordsPerMinute: 4,
      pauseCount: null,
      groups: { yeah: 1, um: 1, hedge: 1 },
      terms: { 'so yeah': 1, 'i think': 1, um: 1 },
    })
  })

  it('exports every drill as versioned JSON', async () => {
    const { service, request } = setup('An agent is a loop.', 5)
    await service.analyzeAudio(request)
    const json = await service.exportJson()
    const parsed: unknown = JSON.parse(value(json))
    expect(parsed).toMatchObject({
      format: 'talk-coach',
      version: 1,
      drills: [{ id: 'drill-1', transcript: 'An agent is a loop.' }],
    })
  })
})
