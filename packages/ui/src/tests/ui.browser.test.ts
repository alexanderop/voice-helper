import { assert, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { UiInput, UiTextarea } from '../index'
import DialogHarness from './DialogHarness.vue'
import RecoveryHarness from './RecoveryHarness.vue'
import '../styles/index.css'

describe('UI components', () => {
  it('dialog traps focus, closes with Escape, and returns focus to its opener', async () => {
    await render(DialogHarness)
    const opener = page.getByRole('button', { name: 'Create note' })
    await opener.click()
    const dialog = page.getByRole('dialog', { name: 'New note' })
    await expect.element(dialog).toBeVisible()
    await expect
      .element(dialog)
      .toHaveAccessibleDescription('Write something worth keeping.')
    await expect
      .element(page.getByRole('button', { name: 'Close dialog' }))
      .toHaveFocus()
    await userEvent.tab({ shift: true })
    await expect
      .element(page.getByRole('button', { name: 'Save note' }))
      .toHaveFocus()
    await userEvent.tab()
    await expect
      .element(page.getByRole('button', { name: 'Close dialog' }))
      .toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await expect.element(dialog).not.toBeInTheDocument()
    await expect.element(opener).toHaveFocus()
  })

  it('input connects its label and validation message to the native field', async () => {
    await render(UiInput, {
      props: {
        label: 'Note title',
        error: 'A title is required.',
        modelValue: '',
      },
    })
    const field = page.getByRole('textbox', { name: 'Note title' })
    await expect
      .element(field)
      .toHaveAccessibleDescription('A title is required.')
    await expect.element(field).toHaveAttribute('aria-invalid', 'true')
    await field.fill('An idea')
    await expect.element(field).toHaveValue('An idea')
  })

  it('textarea forwards native attributes and has an accessible label', async () => {
    await render(UiTextarea, {
      props: { label: 'Your note', modelValue: 'Keep this thought' },
      attrs: { readonly: true },
    })
    const field = page.getByRole('textbox', { name: 'Your note' })
    await expect.element(field).toHaveValue('Keep this thought')
    await expect.element(field).toHaveAttribute('readonly')
  })

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

  it('closing a dialog whose opener was removed focuses the main landmark', async () => {
    await render(RecoveryHarness)
    await page.getByRole('button', { name: 'Delete item', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm deletion' }).click()
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    await expect.element(page.getByRole('main')).toHaveFocus()
  })

  it('mobile sheet dragging requests dismissal and respects a rejected close', async () => {
    const { default: GuardedSheetHarness } =
      await import('./GuardedSheetHarness.vue')
    await page.viewport(390, 844)
    try {
      await render(GuardedSheetHarness)
      await page.getByRole('button', { name: 'Open guarded sheet' }).click()
      const target = page.getByRole('button', { name: 'Allow closing' })
      const handle = document.querySelector('.ui-dialog__handle')
      assert(handle, 'Missing sheet handle')
      await userEvent.dragAndDrop(handle, target)
      await expect
        .element(page.getByRole('status'))
        .toHaveTextContent('Close was rejected.')
      await expect.element(page.getByRole('dialog')).toBeVisible()
      await target.click()
      await userEvent.dragAndDrop(handle, target)
      await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    } finally {
      await page.viewport(1280, 720)
    }
  })
})
