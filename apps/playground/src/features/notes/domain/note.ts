import { Result } from '@starter/result'
import * as v from 'valibot'

export type Note = Readonly<{
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  revision: number
  deletedAt?: number
}>

export type NoteDraft = Readonly<{ title: string; body: string }>
export type NoteError = Readonly<{
  kind: 'validation' | 'storage' | 'conflict' | 'corrupt'
  message: string
  field?: 'title' | 'body'
}>
export type NoteResult<T> = Result<T, NoteError>

const timestampSchema = v.pipe(
  v.number(),
  v.finite(),
  v.minValue(0),
  v.maxValue(8_640_000_000_000_000),
)

export const noteSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
  body: v.pipe(v.string(), v.maxLength(20_000)),
  pinned: v.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  deletedAt: v.exactOptional(timestampSchema),
  revision: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

const draftSchema = v.object({
  title: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'Give your note a title.'),
    v.maxLength(120, 'Keep the title under 121 characters.'),
  ),
  body: v.pipe(
    v.string(),
    v.maxLength(20_000, 'Keep the note under 20,001 characters.'),
  ),
})

export function parseDraft(draft: NoteDraft): NoteResult<NoteDraft> {
  const parsed = v.safeParse(draftSchema, draft)
  return parsed.success
    ? Result.ok(parsed.output)
    : Result.err({
        kind: 'validation',
        message: parsed.issues[0].message,
        field: parsed.issues[0].path?.[0]?.key === 'body' ? 'body' : 'title',
      })
}
