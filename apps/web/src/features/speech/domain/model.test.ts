import { describe, expect, it } from 'vitest'
import { downloadTotals } from './model'

describe('downloadTotals', () => {
  it('sums loaded and total bytes and caps a file at its size', () => {
    const files = new Map([
      ['onnx/encoder_model_quantized.onnx', { loaded: 10, total: 20 }],
      ['onnx/decoder_model_merged_quantized.onnx', { loaded: 70, total: 50 }],
    ])
    expect(downloadTotals(files)).toEqual({ loadedBytes: 60, totalBytes: 70 })
  })
})
