import { fileURLToPath } from 'node:url'
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

const fixture = (name: string) =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))

Given('I open Talk Coach for the first time', async ({ page }) => {
  await page.goto('./')
})

Then('I see the speech model setup', async ({ page }) => {
  await expect(page).toHaveURL(/#\/setup$/)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'A small model. A private studio.',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Download the speech model' }),
  ).toBeEnabled()
})

Then('the app does not claim to be offline ready', async ({ page }) => {
  await expect(page.getByTestId('app-status')).toHaveText('On device')
})

When('I go to Today', async ({ page }) => {
  await page.getByRole('button', { name: 'Today' }).click()
})

Then('practice waits for the speech model', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Start 2-minute drill' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('link', { name: 'Set up the speech model' }),
  ).toBeVisible()
})

Then('the page fits the phone screen', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBe(0)
  const action = await page
    .getByRole('button', { name: 'Start 2-minute drill' })
    .boundingBox()
  const navigation = await page
    .getByRole('navigation', { name: 'Main navigation' })
    .boundingBox()
  expect((action?.y ?? 0) + (action?.height ?? 0)).toBeLessThanOrEqual(
    navigation?.y ?? 0,
  )
})

When('I import the caption file {string}', async ({ page }, name: string) => {
  await page.getByRole('button', { name: 'Progress' }).click()
  await page.getByLabel('Caption file to import').setInputFiles(fixture(name))
  await expect(page).toHaveURL(/#\/drills\//)
})

Then(
  'the result shows {int} yeah, {int} um or uh, and {int} hedges',
  async ({ page }, yeah: number, um: number, hedges: number) => {
    const metric = (label: string) =>
      page
        .locator('.metric')
        .filter({ has: page.getByText(label, { exact: true }) })
        .locator('dd')
    await expect(metric('yeah')).toHaveText(String(yeah))
    await expect(metric('um / uh')).toHaveText(String(um))
    await expect(metric('Hedges')).toHaveText(String(hedges))
    await expect(
      page.getByText('Captions often drop um and uh', { exact: false }),
    ).toBeVisible()
  },
)

Then(
  'the transcript marks {string} as a filler and {string} as a hedge',
  async ({ page }, filler: string, hedge: string) => {
    await expect(
      page.locator('mark.transcript__filler', { hasText: filler }),
    ).toContainText(`filler: ${filler}`)
    await expect(
      page.locator('mark.transcript__hedge', { hasText: hedge }),
    ).toContainText(`hedge: ${hedge}`)
  },
)

When('I reload the app on Progress', async ({ page }) => {
  await page.goto('./#/progress')
  await page.reload()
})

Then(
  '{string} is listed with {int} fillers per minute',
  async ({ page }, name: string, perMinute: number) => {
    const row = page.getByRole('link', { name: new RegExp(name) })
    await expect(row).toContainText(`${perMinute} fillers/min`)
  },
)

When('I delete all data in Settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await expect(page.getByText('Every drill was deleted.')).toBeVisible()
})

Then('Progress lists no imported talks', async ({ page }) => {
  await page.getByRole('button', { name: 'Progress' }).click()
  await expect(page.getByText('No imported talks yet.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('No imported talks yet.')).toBeVisible()
})

When('I choose the dark theme and reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('Dark', { exact: true }).click()
  await page.reload()
})

Then('the dark theme is still selected', async ({ page }) => {
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
