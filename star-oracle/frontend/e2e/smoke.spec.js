import { test, expect } from '@playwright/test'

test.describe('Star Oracle smoke', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/login/)
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveURL(/\/register/)
  })
})
