/** The pick from the research: base.en q8 with a filler prompt. */
export const MODEL_ID = 'onnx-community/whisper-base.en'
export const MODEL_DTYPE = 'q8'
/** Measured: 77 MB of ONNX weights, 2.7 MB of tokenizer and config. */
export const MODEL_SIZE_LABEL = '77 MB'
/** The ONNX runtime binary the worker fetches alongside the model. */
export const ENGINE_SIZE_LABEL = '22 MB'

/**
 * Whisper drops almost every "um" and "uh" unless the previous-text prompt
 * shows them. This is the prompt the research measured.
 */
export const FILLER_PROMPT =
  "So, um, I think we, uh, should go. Um, yeah, and, uh, that's why, um, it works."

/** Files transformers.js fetches for MODEL_ID at MODEL_DTYPE. */
export const MODEL_FILES = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx',
] as const

type Backend = 'wasm' | 'webgpu'

export type ModelStatus =
  | { readonly status: 'checking' }
  | { readonly status: 'missing' }
  | {
      readonly status: 'downloading'
      readonly loadedBytes: number
      readonly totalBytes: number
    }
  | { readonly status: 'loading' }
  | {
      readonly status: 'ready'
      readonly backend: Backend
      readonly loadMs: number
      readonly offline: boolean
    }
  | { readonly status: 'failed'; readonly reason: string }

export type FileProgress = { readonly loaded: number; readonly total: number }

/**
 * Sums bytes across files. A file that has not reported its size yet counts
 * as zero, so the total can grow while the download starts.
 */
export function downloadTotals(files: ReadonlyMap<string, FileProgress>) {
  let loadedBytes = 0
  let totalBytes = 0
  for (const file of files.values()) {
    loadedBytes += Math.min(file.loaded, file.total)
    totalBytes += file.total
  }
  return { loadedBytes, totalBytes }
}

type TranscriptionTiming = {
  readonly ms: number
  readonly audioMs: number
}

export type SpeechDiagnostics = {
  readonly backend: Backend | null
  readonly loadMs: number | null
  readonly lastTranscription: TranscriptionTiming | null
}
