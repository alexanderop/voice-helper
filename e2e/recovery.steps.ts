import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'
const { When, Then } = createBdd()
When(
  'two tabs save different edits to the same note',
  async ({ page, context }) => {
    await page
      .getByRole('button', { name: 'Edit Shared thought', exact: true })
      .click()
    await page
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill('My draft')
    await page
      .getByRole('textbox', { name: 'Note', exact: true })
      .fill('Never lose this')
    const other = await context.newPage()
    await other.goto('/')
    await other
      .getByRole('button', { name: 'Edit Shared thought', exact: true })
      .click()
    await other
      .getByRole('textbox', { name: 'Title', exact: true })
      .fill('Saved elsewhere')
    await other.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(other.getByRole('dialog')).not.toBeVisible()
    await other.close()
    await page.getByRole('button', { name: 'Save note', exact: true }).click()
  },
)
Then(
  'I can keep the conflicting draft as a separate note',
  async ({ page }) => {
    await page
      .getByRole('button', { name: 'Review latest version', exact: true })
      .click()
    await expect(
      page.getByText('Saved elsewhere', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Title', exact: true }),
    ).toHaveValue('My draft')
    await expect(
      page.getByRole('textbox', { name: 'Note', exact: true }),
    ).toHaveValue('Never lose this')
    await page
      .getByRole('button', { name: 'Save as a new note', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'My draft', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Saved elsewhere', exact: true }),
    ).toBeVisible()
  },
)
Then(
  'deletion moves focus to main and Undo restores the note',
  async ({ page }) => {
    await expect(page.getByRole('main')).toBeFocused()
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Keep me', exact: true }),
    ).toBeVisible()
  },
)
Then('I can restore the note from Trash after reloading', async ({ page }) => {
  await page.reload()
  await page.getByRole('button', { name: 'Trash (1)', exact: true }).click()
  await page.getByRole('button', { name: 'Restore', exact: true }).click()
  await page.getByRole('button', { name: 'Back to notes', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Keep me', exact: true }),
  ).toBeVisible()
})
Then('an empty title is explained and focused', async ({ page }) => {
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  const title = page.getByRole('textbox', { name: 'Title', exact: true })
  await expect(title).toHaveAttribute('aria-invalid', 'true')
  await expect(title).toHaveAccessibleDescription('Give your note a title.')
  await expect(title).toBeFocused()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})
Then('note search survives a settings round trip', async ({ page }) => {
  await page
    .getByRole('searchbox', { name: 'Search notes', exact: true })
    .fill('remember me')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.evaluate(() => window.scrollTo(0, 500))
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  await expect(
    page.getByRole('searchbox', { name: 'Search notes', exact: true }),
  ).toHaveValue('remember me')
})
Then('the Settings skip link preserves its route', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const url = page.url()
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true })
  await skip.focus()
  await page.keyboard.press('Enter')
  expect(page.url()).toBe(url)
  await expect(page.getByRole('main')).toBeFocused()
})

Then(
  'I can download and import my backup without replacing the original',
  async ({ page }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const downloadPromise = page.waitForEvent('download')
    await page
      .getByRole('button', { name: 'Export backup', exact: true })
      .click()
    const download = await downloadPromise
    const file = await download.path()
    if (!file) throw new Error('Backup download missing')
    await page.locator('input[type=file]').setInputFiles(file)
    await expect(
      page.getByText('Imported 1 note as new copies.', { exact: false }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Notes', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Backup thought', exact: true }),
    ).toHaveCount(2)
  },
)

Then(
  'browser Back restores the scrolled notes after loading',
  async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await page.evaluate(() => window.scrollTo(0, 700))
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await page.goBack()
    await expect(
      page.getByRole('heading', { name: 'Four', exact: true }),
    ).toBeVisible()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(700)
  },
)
