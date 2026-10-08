import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import TranscriptView from './TranscriptView.vue'

describe('TranscriptView', () => {
  it('marks fillers and hedges with spoken category prefixes', async () => {
    await render(TranscriptView, {
      props: { transcript: 'So, um, I think it works. And yeah.' },
    })
    const marks = Array.from(document.querySelectorAll('mark'), (mark) => [
      mark.getAttribute('class'),
      mark.textContent,
    ])
    expect(marks).toEqual([
      ['transcript__filler', 'filler: um'],
      ['transcript__hedge', 'hedge: I think'],
      ['transcript__filler', 'filler: And yeah'],
    ])
    expect(document.querySelector('.transcript')?.textContent).toBe(
      'So, filler: um, hedge: I think it works. filler: And yeah.',
    )
  })
})
