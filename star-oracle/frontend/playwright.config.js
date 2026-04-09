import { defineConfig, devices } from '@playwright/test'

/**
 * База: http://localhost:5173 (порт без прав администратора).
 * Другой порт: E2E_PORT=8080 npx playwright test
 * Setup вызывает POST /api/dev/e2e-ensure-user на бэкенде (порт 3001) — для локали поднимается webServer.
 */
const PORT = process.env.E2E_PORT || '5173'
const hostURL = `http://127.0.0.1:${PORT}`

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /** Один общий e2e-пользователь и Supabase-сессия — параллельные воркеры дают зависания на birth_profiles. */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/, timeout: 120_000 },
    {
      name: 'e2e',
      testIgnore: /auth\.setup\.js/,
      /** Supabase + /api/prediction нередко >30s при холодном старте. */
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: hostURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
