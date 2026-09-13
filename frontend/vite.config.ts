import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const DIM = '[2m'
const CYAN = '[36m'
const RESET = '[0m'

function unbrokenUrls(): Plugin {
  return {
    name: 'unbroken-urls',
    configureServer(server) {
      const original = server.printUrls.bind(server)
      server.printUrls = () => {
        const urls = server.resolvedUrls
        if (!urls) {
          original()
          return
        }
        for (const [label, list] of [
          ['Local', urls.local],
          ['Network', urls.network],
        ] as const) {
          for (const url of list) {
            server.config.logger.info(`  ${DIM}${label.padEnd(7)}${RESET} ${CYAN}${url}${RESET}`)
          }
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const proxyTarget = env.VITE_API_PROXY

  return {
    plugins: [react(), tailwindcss(), unbrokenUrls()],
    resolve: {
      alias: {
        '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: proxyTarget
        ? {
            '/api': { target: proxyTarget, changeOrigin: true, ws: true },
            '/mail': { target: proxyTarget, changeOrigin: true },
          }
        : undefined,
    },
  }
})
