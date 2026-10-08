import * as v from 'valibot'

const bytes = v.pipe(v.number(), v.minValue(0))

export const requestSchema = v.variant('type', [
  v.object({ type: v.literal('load') }),
  v.object({
    type: v.literal('transcribe'),
    id: v.number(),
    audio: v.instance(Float32Array),
  }),
])
export type WorkerRequest = v.InferOutput<typeof requestSchema>

export const responseSchema = v.variant('type', [
  v.object({
    type: v.literal('download'),
    file: v.string(),
    loaded: bytes,
    total: bytes,
  }),
  v.object({
    type: v.literal('loaded'),
    backend: v.picklist(['wasm', 'webgpu']),
    loadMs: bytes,
  }),
  v.object({ type: v.literal('load-failed'), reason: v.string() }),
  v.object({
    type: v.literal('chunk'),
    id: v.number(),
    done: v.number(),
    total: v.number(),
  }),
  v.object({
    type: v.literal('transcribed'),
    id: v.number(),
    text: v.string(),
    ms: bytes,
  }),
  v.object({
    type: v.literal('transcribe-failed'),
    id: v.number(),
    reason: v.string(),
  }),
])
export type WorkerResponse = v.InferOutput<typeof responseSchema>
