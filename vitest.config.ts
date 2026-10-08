import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { goOfflineFor } from './vitest.commands'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['apps/**/*.test.ts', 'packages/result/**/*.test.ts'],
          exclude: ['**/*.browser.test.ts'],
          typecheck: {
            enabled: true,
            include: ['packages/result/**/*.test-d.ts'],
            tsconfig: 'packages/result/tsconfig.json',
          },
        },
      },
      {
        test: {
          name: 'fitness',
          environment: 'node',
          include: ['architecture/**/*.test.ts'],
        },
      },
      {
        plugins: [vue()],
        optimizeDeps: {
          include: ['vue', '@talk-coach/ui > @lucide/vue'],
        },
        resolve: {
          dedupe: ['vue'],
          alias: {
            '@talk-coach/ui': fileURLToPath(
              new URL('./packages/ui/src/index.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'browser',
          include: [
            'apps/**/*.browser.test.ts',
            'packages/**/*.browser.test.ts',
          ],
          browser: {
            enabled: true,
            provider: playwright({ launchOptions: { channel: 'chrome' } }),
            instances: [{ browser: 'chromium' }],
            headless: true,
            commands: { goOfflineFor },
          },
        },
      },
    ],
  },
})
