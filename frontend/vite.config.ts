import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Variables are read through loadEnv: values from .env.local are not available
// in process.env at the configuration stage, and the proxy is described exactly
// there.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  const proxyTarget = env.VITE_API_PROXY

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: proxyTarget ? { '/api': { target: proxyTarget, changeOrigin: true } } : undefined,
    },
  }
})
