import type { Result } from '@talk-coach/result'
import type { Drill } from '../domain/drill'

/** Whisper reads 16 kHz mono audio, so every decoder returns that. */
export const SPEECH_SAMPLE_RATE = 16_000

export type DrillRepository = {
  list(): Promise<Result<Drill[], 'storage-failed'>>
  add(drill: Drill): Promise<Result<void, 'storage-failed'>>
  clear(): Promise<Result<void, 'storage-failed'>>
}

export type Transcriber = {
  transcribe(
    audio: Float32Array,
    onChunk: (done: number, total: number) => void,
  ): Promise<Result<string, 'model-failed'>>
}

export type AudioDecoder = {
  decode(audio: Blob): Promise<Result<Float32Array, 'decode-failed'>>
}
