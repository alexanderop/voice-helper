import { describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import RecoveryHarness from './RecoveryHarness.vue'
import '../styles/index.css'

describe('UI components', () => {
  it('skip link focuses main content without changing a hash route', async () => {
    await render(RecoveryHarness)
    const previous = window.location.hash
    window.history.replaceState(null, '', '#/settings')
    try {
      const link = page.getByRole('link', { name: 'Skip to content' })
      link.element().focus()
      await userEvent.keyboard('{Enter}')
      await expect.element(page.getByRole('main')).toHaveFocus()
      expect(window.location.hash).toBe('#/settings')
    } finally {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + previous,
      )
    }
  })
})
