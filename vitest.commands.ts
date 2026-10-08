import type { BrowserCommand } from 'vitest/node'

/**
 * Takes the real network of the Playwright browser context offline for a
 * while, then restores it. Chrome drops the test runner's own WebSocket while
 * offline, so the command must restore the network itself instead of relying
 * on a second command from the page. It resolves once the page is back online.
 */
export const goOfflineFor: BrowserCommand<[milliseconds: number]> = async (
  { provider, context },
  milliseconds,
) => {
  if (provider.name !== 'playwright')
    throw new Error('goOfflineFor requires the Playwright provider')
  await context.setOffline(true)
  try {
    await new Promise((resolve) => setTimeout(resolve, milliseconds))
  } finally {
    await context.setOffline(false)
  }
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    goOfflineFor: (milliseconds: number) => Promise<void>
  }
}
