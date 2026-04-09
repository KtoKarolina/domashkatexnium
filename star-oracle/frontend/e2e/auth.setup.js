import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as setup, expect } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const authFile = fileURLToPath(new URL('../.auth/user.json', import.meta.url))

const EMAIL = process.env.E2E_USER_EMAIL || 'test@example.com'
const PASSWORD = process.env.E2E_USER_PASSWORD || 'password123'

async function fillLogin(page) {
  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first()
  const passInput = page.locator('input[type="password"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 60_000 })
  await emailInput.fill(EMAIL)
  await passInput.fill(PASSWORD)
  await page.getByRole('button', { name: 'Войти' }).click()
}

setup('авторизация тестового пользователя', async ({ page }) => {
  mkdirSync(dirname(authFile), { recursive: true })

  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await fillLogin(page)

  try {
    await expect(page).not.toHaveURL(/\/login(\/|$)/, { timeout: 25_000 })
  } catch {
    const needConfirm = await page
      .getByText(/Подтвердите email|подтвердите email|Аккаунт создан/i)
      .isVisible()
      .catch(() => false)
    if (needConfirm) {
      throw new Error(
        'E2E: включено подтверждение email в Supabase. Отключите Authentication → Email → «Confirm email» для тестов, либо вручную подтвердите test@example.com.',
      )
    }

    await page.goto('/register', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.locator('input[type="email"]').first().fill(EMAIL)
    const pw = page.locator('input[type="password"]')
    await pw.nth(0).fill(PASSWORD)
    await pw.nth(1).fill(PASSWORD)
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

    await page.waitForTimeout(4000)

    const confirm = await page
      .getByText(/Подтвердите email|подтвердите email|Аккаунт создан/i)
      .isVisible()
      .catch(() => false)
    if (confirm) {
      throw new Error(
        'E2E: после регистрации требуется email. Отключите «Confirm email» в Supabase для e2e или используйте уже подтверждённый аккаунт.',
      )
    }

    if (page.url().includes('/register')) {
      await page.getByRole('link', { name: 'Войти' }).click()
      await fillLogin(page)
    }

    await expect(page).not.toHaveURL(/\/(login|register)(\/|$)/, { timeout: 25_000 })
  }

  await page.context().storageState({ path: authFile })
})
