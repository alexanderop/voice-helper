import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('I open Talk Coach', async ({ page }) => {
  await page.goto('/')
})

Given('the app is ready offline', async ({ page }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
})

When(
  'I disconnect from the network and reopen the app',
  async ({ page, context }) => {
    await context.setOffline(true)
    await page.reload()
  },
)

Then('I see the settings page', async ({ page }) => {
  await expect(
    page.getByRole('heading', { level: 1, name: 'A little more you.' }),
  ).toBeVisible()
})
