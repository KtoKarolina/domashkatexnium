import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as setup, expect } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const authFile = fileURLToPath(new URL('../.auth/user.json', import.meta.url))
const backendEnvPath = resolve(__dirname, '../../backend/.env')

function parseDotEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const out = {}
  const text = readFileSync(filePath, 'utf8')
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
    if (key) out[key] = val
  }
  return out
}

function e2eConfig() {
  const fromFile = parseDotEnvFile(backendEnvPath)
  const secret = process.env.E2E_SETUP_SECRET?.trim() || fromFile.E2E_SETUP_SECRET?.trim() || ''
  const email = process.env.E2E_USER_EMAIL?.trim() || fromFile.E2E_USER_EMAIL?.trim() || ''
  const password = process.env.E2E_USER_PASSWORD?.trim() || fromFile.E2E_USER_PASSWORD?.trim() || ''
  return { secret, email, password }
}

setup('авторизация тестового пользователя', async ({ page, request }) => {
  mkdirSync(dirname(authFile), { recursive: true })

  const { secret, email, password } = e2eConfig()
  if (!secret || !email || !password) {
    throw new Error(
      'E2E: задайте в star-oracle/backend/.env (или в окружении) переменные E2E_SETUP_SECRET, E2E_USER_EMAIL, E2E_USER_PASSWORD. См. star-oracle/backend/.env.example',
    )
  }

  const apiBase = process.env.E2E_API_BASE || 'http://127.0.0.1:3001'
  const ensureRes = await request.post(`${apiBase}/api/dev/e2e-ensure-user`, {
    data: { email, password },
    headers: { 'x-e2e-secret': secret },
  })
  if (!ensureRes.ok()) {
    throw new Error(`e2e-ensure-user ${ensureRes.status()}: ${await ensureRes.text()}`)
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first()
  const passInput = page.locator('input[type="password"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 })
  await emailInput.fill(email)
  await passInput.fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).not.toHaveURL(/\/login(\/|$)/, { timeout: 25_000 })

  await page.context().storageState({ path: authFile })
})
