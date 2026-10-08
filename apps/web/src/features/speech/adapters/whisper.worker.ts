import {
  AutoProcessor,
  AutoTokenizer,
  Tensor,
  WhisperForConditionalGeneration,
  env,
  type ProgressInfo,
} from '@huggingface/transformers'
import * as v from 'valibot'
import { FILLER_PROMPT, MODEL_DTYPE, MODEL_ID } from '../domain/model'
import { requestSchema, type WorkerResponse } from './protocol'

const SAMPLE_RATE = 16_000
const CHUNK_SAMPLES = SAMPLE_RATE * 30

// The static host answers unknown paths with index.html, so a local model
// lookup would read HTML as JSON.
env.allowLocalModels = false
// Only the binary comes from ort/; the runtime's JavaScript is bundled here.
const wasm = env.backends.onnx.wasm
if (wasm)
  wasm.wasmPaths = {
    wasm: new URL(
      `${import.meta.env.BASE_URL}ort/ort-wasm-simd-threaded.jsep.wasm`,
      self.location.origin,
    ).href,
  }

type Whisper = Awaited<ReturnType<typeof loadModel>>
let loading: Promise<Whisper> | undefined

function post(message: WorkerResponse) {
  self.postMessage(message)
}

function onProgress(info: ProgressInfo) {
  if (info.status === 'progress')
    post({
      type: 'download',
      file: info.file,
      loaded: info.loaded,
      total: info.total,
    })
}

async function loadModel() {
  const options = { progress_callback: onProgress }
  const [processor, tokenizer, model] = await Promise.all([
    AutoProcessor.from_pretrained(MODEL_ID, options),
    AutoTokenizer.from_pretrained(MODEL_ID, options),
    WhisperForConditionalGeneration.from_pretrained(MODEL_ID, {
      ...options,
      dtype: MODEL_DTYPE,
      device: 'wasm',
    }),
  ])
  const id = (token: string) => tokenizer.model.tokens_to_ids.get(token) ?? 0
  // transformers.js 3.8 has no prompt_ids option, so the previous-text prompt
  // goes in front of the start tokens by hand.
  const prefix = [
    id('<|startofprev|>'),
    ...tokenizer.encode(` ${FILLER_PROMPT}`, { add_special_tokens: false }),
    id('<|startoftranscript|>'),
    id('<|notimestamps|>'),
  ]
  return { processor, tokenizer, model, prefix }
}

async function load() {
  const started = performance.now()
  loading ??= loadModel()
  try {
    await loading
    post({
      type: 'loaded',
      backend: 'wasm',
      loadMs: Math.round(performance.now() - started),
    })
  } catch (error) {
    loading = undefined
    post({ type: 'load-failed', reason: String(error) })
  }
}

const featuresSchema = v.object({ input_features: v.instance(Tensor) })

async function transcribeChunk(whisper: Whisper, audio: Float32Array) {
  const features: unknown = await whisper.processor(audio)
  // generate() merges extra keys into its generation config at runtime; the
  // published types only list the documented parameters.
  const request = {
    ...v.parse(featuresSchema, features),
    decoder_input_ids: whisper.prefix,
    max_new_tokens: 220,
    no_repeat_ngram_size: 5,
  }
  const output = await whisper.model.generate(request)
  if (!(output instanceof Tensor)) throw new Error('Unexpected model output')
  const rows: unknown = output.tolist()
  const ids = v
    .parse(v.array(v.array(v.union([v.number(), v.bigint()]))), rows)[0]
    ?.map(Number)
    .slice(whisper.prefix.length)
  return whisper.tokenizer.decode(ids ?? [], { skip_special_tokens: true })
}

async function transcribe(id: number, audio: Float32Array) {
  const started = performance.now()
  try {
    loading ??= loadModel()
    const whisper = await loading
    const total = Math.max(1, Math.ceil(audio.length / CHUNK_SAMPLES))
    const chunks = Array.from({ length: total }, (_, chunk) =>
      audio.slice(chunk * CHUNK_SAMPLES, (chunk + 1) * CHUNK_SAMPLES),
    )
    // One chunk at a time keeps memory flat and progress in order.
    const parts = await chunks.reduce<Promise<string[]>>(
      async (previous, chunk, index) => {
        const done = await previous
        const text = await transcribeChunk(whisper, chunk)
        post({ type: 'chunk', id, done: index + 1, total })
        return [...done, text.trim()]
      },
      Promise.resolve([]),
    )
    post({
      type: 'transcribed',
      id,
      text: parts.filter(Boolean).join(' '),
      ms: Math.round(performance.now() - started),
    })
  } catch (error) {
    post({ type: 'transcribe-failed', id, reason: String(error) })
  }
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  const request = v.safeParse(requestSchema, event.data)
  if (!request.success) return
  if (request.output.type === 'load') void load()
  else void transcribe(request.output.id, request.output.audio)
})
