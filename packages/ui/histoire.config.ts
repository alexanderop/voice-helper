import { defineConfig } from 'histoire'
import { fileURLToPath } from 'node:url'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  vite: {
    server: {
      fs: { allow: [fileURLToPath(new URL('../../', import.meta.url))] },
    },
  },
  setupFile: './histoire.setup.ts',
  storyMatch: ['src/**/*.story.vue'],
  theme: {
    title: 'Starter UI',
    colors: { primary: { 500: '#147d70', 600: '#11685e' } },
  },
})
