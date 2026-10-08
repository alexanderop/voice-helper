import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { parseDraft } from './note'

const visibleTitle = fc
  .string({ minLength: 1, maxLength: 120 })
  .filter((title) => title.trim().length > 0)
const anyBody = fc.string({ maxLength: 2_000 })

describe('given any draft with a visible title', () => {
  it('should accept it, trim the title, and keep the body unchanged', () => {
    fc.assert(
      fc.property(visibleTitle, anyBody, (title, body) => {
        const parsed = parseDraft({ title, body })
        expect(parsed.isOk()).toBe(true)
        expect(parsed.unwrap()).toEqual({ title: title.trim(), body })
      }),
    )
  })
})

describe('given a draft whose title is only whitespace', () => {
  it('should reject it as a title validation error', () => {
    const blank = fc.stringMatching(/^\s{0,40}$/)
    fc.assert(
      fc.property(blank, anyBody, (title, body) => {
        const parsed = parseDraft({ title, body })
        expect(parsed).toMatchObject({
          status: 'error',
          error: { kind: 'validation', field: 'title' },
        })
      }),
    )
  })
})

describe('given a body longer than 20,000 characters', () => {
  it('should reject it as a body validation error', () => {
    fc.assert(
      fc.property(
        visibleTitle,
        fc.string({ minLength: 20_001, maxLength: 20_100 }),
        (title, body) => {
          const parsed = parseDraft({ title, body })
          expect(parsed).toMatchObject({
            status: 'error',
            error: { kind: 'validation', field: 'body' },
          })
        },
      ),
      { numRuns: 20 },
    )
  })
})
