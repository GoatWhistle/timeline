import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    // В Node нет относительных URL: базовый путь API должен быть абсолютным.
    env: { VITE_API_BASE_URL: 'http://localhost/api/v1', VITE_ENABLE_MSW: '1' },
  },
})
