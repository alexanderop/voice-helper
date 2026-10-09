import { createReadStream, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const ORT_WASM = 'ort-wasm-simd-threaded.jsep.wasm'
const ortDirectory = dirname(
  createRequire(import.meta.url).resolve('@huggingface/transformers'),
)

/**
 * Serves the ONNX runtime binary at a stable `ort/` path instead of the
 * jsDelivr default, so the service worker and the model cache check can find
 * it offline. The runtime's JavaScript is already bundled into the worker.
 */
function onnxRuntime(): Plugin {
  return {
    name: 'talk-coach-onnx-runtime',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.endsWith(`/ort/${ORT_WASM}`)) return next()
        response.setHeader('Content-Type', 'application/wasm')
        createReadStream(join(ortDirectory, ORT_WASM)).pipe(response)
      })
    },
    generateBundle(_options, bundle) {
      // The runtime also references a hashed copy that is never fetched once
      // wasmPaths points at ort/. Dropping it saves 21 MB per deploy.
      for (const [name, file] of Object.entries(bundle))
        if (file.type === 'asset' && /ort-wasm[^/]*\.wasm$/.test(name))
          Reflect.deleteProperty(bundle, name)
      this.emitFile({
        type: 'asset',
        fileName: `ort/${ORT_WASM}`,
        source: readFileSync(join(ortDirectory, ORT_WASM)),
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  worker: { format: 'es' },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION ?? '0.1.0'),
  },
  plugins: [
    vue(),
    onnxRuntime(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Talk Coach',
        short_name: 'Talk Coach',
        description:
          'Two-minute speaking drills that count your fillers and hedges on your device.',
        theme_color: '#0D1626',
        background_color: '#0D1626',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The speech worker bundles transformers.js, which is above the 2 MB
        // default. The model and the ONNX runtime are fetched on demand.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Workbox copies this function into sw.js, so it cannot use
            // constants from this file.
            urlPattern: ({ url }) =>
              url.pathname.endsWith('/ort/ort-wasm-simd-threaded.jsep.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'talk-coach-onnx-runtime' },
          },
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
})
