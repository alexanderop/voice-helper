import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const publicDir = new URL('../apps/web/public/', import.meta.url)
const svg = readFileSync(new URL('favicon.svg', publicDir), 'utf8')

async function render(browser, size) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  })
  await page.setContent(
    `<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`,
  )
  await page.screenshot({
    path: new URL(`icon-${size}.png`, publicDir).pathname,
  })
}

const browser = await chromium.launch()
try {
  await Promise.all([192, 512].map((size) => render(browser, size)))
} finally {
  await browser.close()
}
