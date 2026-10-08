import { Result } from '@talk-coach/result'
import { analyze } from '../domain/analysis'
import { parseCaptions } from '../domain/captions'
import { newestFirst, type Drill, type DrillKind } from '../domain/drill'
import { detectPauses } from '../domain/pauses'
import type { ProcessingStage, SessionError } from '../domain/session'
import {
  SPEECH_SAMPLE_RATE,
  type AudioDecoder,
  type DrillRepository,
  type Transcriber,
} from '../ports/ports'

const MIN_AUDIO_MS = 2000
const MIN_WORDS = 3
const CHUNK_SAMPLES = SPEECH_SAMPLE_RATE * 30

export type AudioRequest = {
  readonly kind: DrillKind
  readonly prompt: string
  readonly audio: Blob
  readonly onStage: (stage: ProcessingStage) => void
}

export function createDrillService({
  repository,
  transcriber,
  decoder,
  now,
  newId,
}: {
  repository: DrillRepository
  transcriber: Transcriber
  decoder: AudioDecoder
  now: () => number
  newId: () => string
}) {
  async function save(
    fields: Omit<Drill, 'id' | 'recordedAt' | 'analysis'>,
    pauses: Parameters<typeof analyze>[2],
  ): Promise<Result<Drill, SessionError>> {
    const analysis = analyze(fields.transcript, fields.durationMs, pauses)
    if (analysis.wordCount < MIN_WORDS) return Result.err('too-short')
    const drill: Drill = { ...fields, id: newId(), recordedAt: now(), analysis }
    const saved = await repository.add(drill)
    return saved.isOk() ? Result.ok(drill) : Result.err(saved.error)
  }

  async function analyzeAudio({
    kind,
    prompt,
    audio,
    onStage,
  }: AudioRequest): Promise<Result<Drill, SessionError>> {
    const decoded = await decoder.decode(audio)
    if (decoded.isErr()) return Result.err(decoded.error)
    const samples = decoded.value
    const durationMs = Math.round((samples.length / SPEECH_SAMPLE_RATE) * 1000)
    if (durationMs < MIN_AUDIO_MS) return Result.err('too-short')
    const chunks = Math.ceil(samples.length / CHUNK_SAMPLES)
    onStage({ step: 'transcribing', chunk: 0, chunks })
    const transcript = await transcriber.transcribe(samples, (chunk, total) =>
      onStage({ step: 'transcribing', chunk, chunks: total }),
    )
    if (transcript.isErr()) return Result.err(transcript.error)
    onStage({ step: 'saving' })
    return save(
      { kind, prompt, durationMs, transcript: transcript.value },
      detectPauses(samples, SPEECH_SAMPLE_RATE),
    )
  }

  function importCaptions(name: string, text: string) {
    const { transcript, durationMs } = parseCaptions(text)
    return save({ kind: 'import', prompt: name, durationMs, transcript }, null)
  }

  async function list(): Promise<Result<Drill[], 'storage-failed'>> {
    const drills = await repository.list()
    return drills.isOk() ? Result.ok(newestFirst(drills.value)) : drills
  }

  async function exportJson(): Promise<Result<string, 'storage-failed'>> {
    const drills = await list()
    if (drills.isErr()) return drills
    const backup = { format: 'talk-coach', version: 1, drills: drills.value }
    return Result.ok(JSON.stringify(backup, null, 2))
  }

  return {
    analyzeAudio,
    importCaptions,
    list,
    exportJson,
    clear: () => repository.clear(),
  }
}

export type DrillService = ReturnType<typeof createDrillService>
