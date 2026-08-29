import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = {
  '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

const shared = {
  environment: 'jsdom' as const,
  globals: true,
  css: false,
  env: { VITE_API_BASE_URL: 'http://localhost/api/v1' },
}

export default defineConfig({
  resolve: { alias },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.gen.*', 'tests/**', '**/index.ts'],
      thresholds: {
        lines: 38.97,
        functions: 27.52,
        branches: 39.75,
        statements: 39.58,
      },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          ...shared,
          name: 'unit',
          setupFiles: ['./tests/support/setup.ts'],
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: ['tests/**/*.lazy.test.{ts,tsx}'],
        },
      },
      {
        resolve: { alias },
        test: {
          ...shared,
          name: 'lazy',
          setupFiles: ['./tests/support/setup-lazy.ts'],
          include: ['tests/**/*.lazy.test.{ts,tsx}'],
        },
      },
    ],
  },
})
