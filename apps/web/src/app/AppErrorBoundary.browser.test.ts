import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import AppErrorBoundary from './AppErrorBoundary.vue'

describe('AppErrorBoundary', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('unexpected child errors offer focused recovery without leaking note contents', async () => {
    vi.stubGlobal('__APP_VERSION__', 'test-build')
    const Broken = defineComponent({
      setup() {
        throw new Error('Private note text must not be exposed')
      },
      render() {
        return null
      },
    })
    await render(AppErrorBoundary, { slots: { default: () => h(Broken) } })
    await expect
      .element(page.getByRole('heading', { name: 'Something went wrong.' }))
      .toHaveFocus()
    await expect
      .element(page.getByRole('button', { name: 'Reload app' }))
      .toBeVisible()
    await page.getByText('Safe diagnostics').click()
    const content = page.getByRole('alert').element().textContent
    expect(content).toContain('test-build')
    expect(content).not.toContain('Private note text')
  })
})
