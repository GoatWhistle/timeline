import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const apiPort = process.env.CONTRACT_API_PORT ?? '55480'
const baseUrl = process.env.CONTRACT_API_BASE_URL ?? `http://127.0.0.1:${apiPort}/api/v1`

export default defineConfig({
  resolve: {
    alias: {
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests-contract/support/setup.ts'],
    css: false,
    include: ['tests-contract/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: { VITE_API_BASE_URL: baseUrl },
  },
})
