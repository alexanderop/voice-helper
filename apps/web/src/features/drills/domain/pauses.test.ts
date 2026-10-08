import { describe, expect, it } from 'vitest'
import { detectPauses } from './pauses'

const RATE = 1000

function clip(
  ...parts: readonly (readonly [amplitude: number, ms: number])[]
): Float32Array {
  const samples: number[] = []
  for (const [amplitude, ms] of parts)
    for (let index = 0; index < ms; index += 1)
      samples.push(index % 2 ? amplitude : -amplitude)
  return Float32Array.from(samples)
}

describe('detectPauses', () => {
  it('finds silences of at least one second between speech', () => {
    const audio = clip(
      [0, 600],
      [0.5, 900],
      [0.001, 1200],
      [0.4, 900],
      [0.002, 600],
      [0.5, 600],
      [0, 900],
    )
    expect(detectPauses(audio, RATE)).toEqual([
      { startMs: 1500, durationMs: 1200 },
    ])
  })

  it('ignores silence before the first and after the last speech', () => {
    const audio = clip([0, 1500], [0.5, 300], [0, 1200], [0.5, 300], [0, 1500])
    expect(detectPauses(audio, RATE)).toEqual([
      { startMs: 1800, durationMs: 1200 },
    ])
  })
})
