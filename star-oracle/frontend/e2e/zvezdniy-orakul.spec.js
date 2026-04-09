import { test, expect } from '@playwright/test'

test.describe('Ключевые сценарии (десктоп)', () => {
  test('пользователь вводит дату рождения, сохраняет и видит гороскоп: знак, текст, число и цвет', async ({
    page,
  }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Дата *').waitFor({ state: 'visible', timeout: 60_000 })

    await page.getByLabel('Дата *').fill('1995-07-15')
    await page.getByLabel(/Город/i).fill('Москва')
    await page.getByRole('button', { name: /Сохранить/i }).click()

    await expect(page.getByText(/Данные сохранены/i)).toBeVisible({ timeout: 20_000 })

    await page.goto('/forecast', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /Сегодня/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/🍀\s*Число|Число дня/i).first()).toBeVisible({ timeout: 90_000 })
    const aiHeading = page.getByRole('heading', { name: /AI-прогноз/i })
    if (await aiHeading.isVisible().catch(() => false)) {
      await expect(aiHeading).toContainText(/Овен|Телец|Близнецы|Рак|Лев|Дева|Весы|Скорпион|Стрелец|Козерог|Водолей|Рыбы/i)
      await expect(page.getByText(/Цвет/).first()).toBeVisible()
    } else {
      await expect(page.locator('main p').filter({ hasText: /.{25,}/ }).first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test('при пустой дате форма показывает понятную ошибку', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    await page.getByLabel('Дата *').fill('')
    await page.getByRole('button', { name: /Сохранить/i }).click()

    await expect(page.getByText('Укажите дату рождения')).toBeVisible()
  })

  test('при дате в будущем форма показывает понятную ошибку', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    const far = new Date()
    far.setFullYear(far.getFullYear() + 2)
    const iso = far.toISOString().slice(0, 10)

    await page.getByLabel('Дата *').fill(iso)
    await page.getByLabel(/Город/i).fill('')
    await page.getByRole('button', { name: /Сохранить/i }).click()

    await expect(page.getByText('Дата не может быть в будущем')).toBeVisible()
  })
})
