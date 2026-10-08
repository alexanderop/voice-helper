import { mkdir } from 'node:fs/promises'
import { chromium, devices, expect } from '@playwright/test'

const url = process.argv[2]
if (!url)
  throw new Error('Usage: node scripts/verify-deployment.mjs <site-url>')
const target = new URL(url)
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 360, height: 800 },
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.setDefaultNavigationTimeout(30_000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const response = await page.goto(target.href)
  expect(response?.status()).toBe(200)
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Phone check')
  await page
    .getByRole('textbox', { name: 'Note', exact: true })
    .fill('Saved on this device. Ready to go offline.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Phone check', exact: true }),
  ).toBeVisible()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  const registration = await page.evaluate(async () => {
    const worker = await navigator.serviceWorker.ready
    return { scope: worker.scope, script: worker.active?.scriptURL }
  })
  expect(registration.scope).toBe(target.href)
  expect(registration.script).toBe(new URL('sw.js', target).href)
  const manifestResponse = await context.request.get(
    new URL('manifest.webmanifest', target).href,
  )
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(new URL(manifest.start_url, target).pathname).toBe(target.pathname)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page).toHaveURL(new URL('#/settings', target).href)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Check for updates', exact: true }),
  ).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await mkdir('test-results', { recursive: true })
  await page.screenshot({
    path: 'test-results/deployed-settings.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Phone check', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Offline works')
  await page
    .getByRole('textbox', { name: 'Note', exact: true })
    .fill('Created without a network connection.')
  await page.getByRole('button', { name: 'Save note', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Offline works', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
  await mkdir('test-results', { recursive: true })
  await page.screenshot({
    path: 'test-results/deployed-mobile.png',
    fullPage: true,
  })
  console.log(
    JSON.stringify(
      {
        url: target.href,
        registration,
        result:
          'Passed mobile save, route reload, offline reload and write, manifest path, viewport and runtime checks.',
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
