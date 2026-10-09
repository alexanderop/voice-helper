import { analyze } from './analysis'
import type { Drill, DrillKind } from './drill'

export function drill(
  kind: DrillKind,
  recordedAt: number,
  transcript: string,
): Drill {
  return timed(kind, recordedAt, [transcript, 60_000])
}

export function timed(
  kind: DrillKind,
  recordedAt: number,
  [transcript, durationMs]: readonly [string, number | null],
): Drill {
  return {
    id: `${kind}-${recordedAt}`,
    kind,
    prompt:
      kind === 'import' ? 'Vue.js Talks #16' : 'Explain what an agent is.',
    recordedAt,
    durationMs,
    transcript,
    analysis: analyze(transcript, durationMs, []),
  }
}
