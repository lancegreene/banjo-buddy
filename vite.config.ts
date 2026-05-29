import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// The Anthropic SDK's `EnvironmentWorker` (reachable via the static graph from
// `@anthropic-ai/sdk`'s main entry) does `await import("../../tools/agent-toolset/node.mjs")`
// inside its handler. Rollup follows that dynamic import statically, then the
// Node-only toolset modules try to import `node:fs`, `node:crypto`, `node:path`,
// etc. and fail under the browser-external shim. The browser never runs the
// worker code path (we only use `messages.create` in `useCoachChat`), so it's
// safe to redirect the whole agent-toolset Node subtree at an empty stub.
const anthropicSdkBrowserStub = path.resolve(
  __dirname,
  'src/shims/anthropic-agent-toolset-node-stub.mjs',
)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/*.png'],
      manifest: false, // use public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,onnx}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3|wav|ogg|webm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  base: '/banjo-buddy/',
  build: { chunkSizeWarningLimit: 2000 },
  resolve: {
    alias: [
      // Anthropic SDK Node-only agent toolset — stub out to avoid pulling
      // node:fs/crypto/path/child_process into the browser bundle. See note
      // above `anthropicSdkBrowserStub`. Matches both the bare specifier
      // form (used in JSDoc / sub-path exports) and the relative form Rollup
      // sees inside `lib/environments/worker.mjs`.
      {
        find: /(^|\/)tools\/agent-toolset\/(node|fs-util|skills)\.mjs$/,
        replacement: anthropicSdkBrowserStub,
        customResolver(_source, importer) {
          // Only intercept imports originating from inside the Anthropic SDK,
          // so we don't accidentally swallow unrelated paths in user code.
          if (!importer || !importer.includes('@anthropic-ai')) return null
          return anthropicSdkBrowserStub
        },
      },
    ],
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        timeout: 60000,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Strip browser headers so Anthropic sees this as a server request
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
            // Inject API key server-side so it never reaches the browser
            const key = env.VITE_ANTHROPIC_API_KEY
            if (key) {
              proxyReq.setHeader('x-api-key', key)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
            }
          })
        },
      },
    },
  },
})
})
