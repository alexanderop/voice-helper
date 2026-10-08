import { createBdd } from 'playwright-bdd'

const { When } = createBdd()

When('the app is ready offline', async ({ page }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
})

When(
  'I disconnect from the network and reopen Progress',
  async ({ page, context }) => {
    await context.setOffline(true)
    await page.goto('./#/progress')
    await page.reload()
  },
)

When('I open the imported talk', async ({ page }) => {
  await page.getByRole('link', { name: /vue-talk\.vtt/ }).click()
})
