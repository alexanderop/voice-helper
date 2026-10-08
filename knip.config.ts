import type { KnipConfig } from 'knip'
import { parse } from '@vue/compiler-sfc'

function vueScripts(text: string) {
  const { descriptor } = parse(text)
  return [descriptor.script?.content, descriptor.scriptSetup?.content]
    .filter(Boolean)
    .join('\n')
}

export default {
  compilers: { vue: vueScripts },
  workspaces: {
    '.': {
      entry: ['scripts/*.mjs', 'e2e/**/*.steps.ts'],
      project: ['scripts/**', 'e2e/**', 'architecture/**', '*.config.{js,ts}'],
    },
    'apps/playground': {
      project: ['src/**/*.{ts,vue}'],
    },
    'packages/composables': {
      project: ['src/**/*.ts'],
    },
    'packages/ui': {
      entry: ['histoire.config.ts', 'histoire.setup.ts', 'src/**/*.story.vue'],
      project: ['src/**/*.{ts,vue}', '*.ts'],
    },
  },
} satisfies KnipConfig
