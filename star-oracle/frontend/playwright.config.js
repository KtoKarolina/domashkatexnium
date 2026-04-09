import { defineConfig, devices } from '@playwright/test'

/**
 * База: http://localhost:5173 (порт без прав администратора).
 * Другой порт: E2E_PORT=8080 npx playwright test
 * Вход e2e: в Supabase должен быть подтверждённый пользователь (по умолчанию test@example.com / password123).
 */
const PORT = process.env.E2E_PORT || '5173'
const hostURL = `http://127.0.0.1:${PORT}`

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: hostURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
