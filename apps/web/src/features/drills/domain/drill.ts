import * as v from 'valibot'
import { analysisSchema } from './analysis'

const DRILL_KINDS = ['drill', 'opening', 'closing', 'import'] as const
export type DrillKind = (typeof DRILL_KINDS)[number]

/** How long each spoken kind records before it stops on its own. */
export const TIME_LIMIT_MS: Readonly<
  Record<Exclude<DrillKind, 'import'>, number>
> = {
  drill: 120_000,
  opening: 30_000,
  closing: 30_000,
}

const millis = v.pipe(v.number(), v.integer(), v.minValue(0))

export const drillSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  kind: v.picklist(DRILL_KINDS),
  prompt: v.string(),
  recordedAt: millis,
  durationMs: v.nullable(millis),
  transcript: v.string(),
  analysis: analysisSchema,
})
export type Drill = v.InferOutput<typeof drillSchema>

export function newestFirst(drills: readonly Drill[]): Drill[] {
  return drills.toSorted((a, b) => b.recordedAt - a.recordedAt)
}

/** The drill of the same kind recorded just before this one, if any. */
export function previousOfKind(
  drills: readonly Drill[],
  drill: Drill,
): Drill | undefined {
  return newestFirst(drills).find(
    (other) => other.kind === drill.kind && other.recordedAt < drill.recordedAt,
  )
}
