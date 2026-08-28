import { defineConfig, devices } from '@playwright/test'

const apiPort = process.env.CONTRACT_API_PORT ?? '55480'
const apiOrigin = process.env.E2E_API_ORIGIN ?? `http://127.0.0.1:${apiPort}`
const port = Number(process.env.E2E_WEB_PORT ?? 5174)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_PROXY: apiOrigin, VITE_API_BASE_URL: '/api/v1' },
  },
})
