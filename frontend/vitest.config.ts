import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/support/setup.ts'],
    css: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    env: { VITE_API_BASE_URL: 'http://localhost/api/v1' },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.gen.*', 'tests/**', '**/index.ts'],
      thresholds: {
        lines: 16.74,
        functions: 10.5,
        branches: 11.39,
        statements: 16.31,
      },
    },
  },
})
