import { PAUSE_MIN_MS, type Pause } from './analysis'

const FRAME_MS = 30

/**
 * Energy-based silence detection, not voice activity detection. A frame is
 * silent when its RMS falls below a tenth (-20 dB) of the clip's loud frames,
 * so the threshold follows the microphone gain. Silence before the first and
 * after the last spoken frame is not a pause.
 */
export function detectPauses(
  samples: Float32Array,
  sampleRate: number,
): Pause[] {
  const frameLength = Math.max(1, Math.round((sampleRate * FRAME_MS) / 1000))
  const levels: number[] = []
  for (
    let start = 0;
    start + frameLength <= samples.length;
    start += frameLength
  ) {
    let sum = 0
    for (let index = start; index < start + frameLength; index += 1) {
      const sample = samples[index] ?? 0
      sum += sample * sample
    }
    levels.push(Math.sqrt(sum / frameLength))
  }
  const loud =
    levels.toSorted((a, b) => a - b)[Math.floor(levels.length * 0.9)] ?? 0
  const threshold = Math.max(loud * 0.1, 1e-4)
  const pauses: Pause[] = []
  let silentSince: number | undefined
  let spoken = false
  levels.forEach((level, frame) => {
    if (level < threshold) {
      silentSince ??= frame
      return
    }
    if (spoken && silentSince !== undefined) {
      const durationMs = (frame - silentSince) * FRAME_MS
      if (durationMs >= PAUSE_MIN_MS)
        pauses.push({ startMs: silentSince * FRAME_MS, durationMs })
    }
    spoken = true
    silentSince = undefined
  })
  return pauses
}
