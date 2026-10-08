import * as fc from 'fast-check'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { backupLimits, parseBackup, serializeBackup } from './backup'
import { noteSchema, type Note } from './note'

const timestamp = fc.integer({ min: 0, max: 8_640_000_000_000_000 })
const note: fc.Arbitrary<Note> = fc.record(
  {
    id: fc.string({ minLength: 1 }),
    title: fc
      .string({ minLength: 1, maxLength: 120 })
      .filter((title) => title.trim().length > 0),
    body: fc.string({ maxLength: 500 }),
    pinned: fc.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: timestamp,
    revision: fc.integer({ min: 1 }),
  },
  {
    requiredKeys: [
      'id',
      'title',
      'body',
      'pinned',
      'createdAt',
      'updatedAt',
      'revision',
    ],
  },
)

const tagOf = (result: { isErr(): boolean; error?: { _tag: string } }) =>
  result.isErr() ? result.error?._tag : 'ok'

describe('given any valid set of stored notes', () => {
  it('should restore exactly the same notes after a backup round trip', () => {
    fc.assert(
      fc.property(fc.array(note, { maxLength: 20 }), (notes) => {
        const restored = serializeBackup(notes).andThen(parseBackup)
        expect(restored.unwrap()).toEqual(notes)
      }),
    )
  })

  it('should satisfy the stored note schema', () => {
    fc.assert(
      fc.property(note, (stored) => {
        expect(v.is(noteSchema, stored)).toBe(true)
      }),
    )
  })
})

describe('given a collection over the note limit', () => {
  it('should refuse to serialize it', () => {
    fc.assert(
      fc.property(note, fc.integer({ min: 1, max: 5 }), (stored, extra) => {
        const notes = Array.from(
          { length: backupLimits.notes + extra },
          () => stored,
        )
        const result = serializeBackup(notes)
        expect(tagOf(result)).toBe('CollectionTooLarge')
      }),
      { numRuns: 5 },
    )
  })
})

describe('given text that is not JSON', () => {
  it('should report the file as unreadable', () => {
    const notJson = fc.string().filter((text) => {
      try {
        JSON.parse(text)
        return false
      } catch {
        return true
      }
    })
    fc.assert(
      fc.property(notJson, (text) => {
        expect(tagOf(parseBackup(text))).toBe('BackupUnreadable')
      }),
    )
  })
})

describe('given JSON that is not a Fieldnotes backup', () => {
  it('should report the backup as invalid', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (json) => {
        expect(tagOf(parseBackup(JSON.stringify(json)))).toBe('InvalidBackup')
      }),
    )
  })

  it('should reject any version other than 1', () => {
    fc.assert(
      fc.property(
        fc.anything().filter((version) => version !== 1),
        fc.array(note, { maxLength: 3 }),
        (version, notes) => {
          const text = JSON.stringify({ format: 'fieldnotes', version, notes })
          expect(tagOf(parseBackup(text))).not.toBe('ok')
        },
      ),
    )
  })
})
