import { test, expect, devices } from '@playwright/test'

/** Эмуляция iPhone без WebKit — на окружении может быть только Chromium. */
const iphone13 = devices['iPhone 13']
test.use({
  userAgent: iphone13.userAgent,
  viewport: iphone13.viewport,
  deviceScaleFactor: iphone13.deviceScaleFactor,
  isMobile: iphone13.isMobile,
  hasTouch: iphone13.hasTouch,
})

test.describe('Мобильный: сайт ведёт себя как на компьютере', () => {
  test('форма даты, кнопка сохранения и переход к прогнозу работают', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /дата рождения/i })).toBeVisible()
    await page.getByLabel('Дата *').fill('1988-03-01')
    await page.getByRole('button', { name: /Сохранить/i }).click()

    await expect(page.getByText(/Данные сохранены|сохранены/i)).toBeVisible({ timeout: 25_000 })

    await page.goto('/forecast', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Сегодня/i })).toBeVisible({ timeout: 15_000 })
  })
})
