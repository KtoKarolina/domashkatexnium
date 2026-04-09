import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as setup, expect } from '@playwright/test'

/** Должен совпадать с fallback в backend getE2EEndpointSecret */
const E2E_LOCAL_FALLBACK = 'local-e2e-star-oracle'

const __dirname = dirname(fileURLToPath(import.meta.url))
const authFile = fileURLToPath(new URL('../.auth/user.json', import.meta.url))

const EMAIL = process.env.E2E_USER_EMAIL || 'test@example.com'
const PASSWORD = process.env.E2E_USER_PASSWORD || 'password123'

function getPlaywrightE2ESecret() {
  const fromEnv = process.env.E2E_SETUP_SECRET?.trim()
  if (fromEnv) return fromEnv
  const backendEnv = resolve(__dirname, '../../backend/.env')
  if (existsSync(backendEnv)) {
    const text = readFileSync(backendEnv, 'utf8')
    for (const line of text.split(/\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const key = t.slice(0, i).trim()
      let val = t.slice(i + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (key === 'E2E_SETUP_SECRET' && val) return val
    }
  }
  if (process.env.NODE_ENV === 'production') return ''
  if (process.env.DISABLE_E2E_DEV_ENDPOINT === '1') return ''
  return E2E_LOCAL_FALLBACK
}

setup('авторизация тестового пользователя', async ({ page, request }) => {
  mkdirSync(dirname(authFile), { recursive: true })

  const secret = getPlaywrightE2ESecret()
  if (!secret) {
    throw new Error(
      'E2E: задайте E2E_SETUP_SECRET или не используйте NODE_ENV=production при прогоне (нужен локальный fallback).',
    )
  }
  const apiBase = process.env.E2E_API_BASE || 'http://127.0.0.1:3001'
  const ensureRes = await request.post(`${apiBase}/api/dev/e2e-ensure-user`, {
    data: { email: EMAIL, password: PASSWORD },
    headers: { 'x-e2e-secret': secret },
  })
  if (!ensureRes.ok()) {
    throw new Error(`e2e-ensure-user ${ensureRes.status()}: ${await ensureRes.text()}`)
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first()
  const passInput = page.locator('input[type="password"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 })
  await emailInput.fill(EMAIL)
  await passInput.fill(PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).not.toHaveURL(/\/login(\/|$)/, { timeout: 25_000 })

  await page.context().storageState({ path: authFile })
})
