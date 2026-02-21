import { test, expect } from '@playwright/test'

/**
 * Smoke-Test: App und Login-Seite erreichbar, erwartete Inhalte sichtbar.
 * Dev-Server muss laufen: npm run dev
 */
test.describe('Smoke', () => {
  test('Login-Seite lädt und zeigt Titel PLU Planner', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'PLU Planner', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible()
  })

  test('Root leitet nicht eingeloggte User zur Login-Seite um', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Geschützte Route /user leitet zur Login-Seite um', async ({ page }) => {
    await page.goto('/user')
    await expect(page).toHaveURL(/\/login/)
  })
})
