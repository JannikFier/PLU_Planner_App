import { test, expect } from '@playwright/test'

/**
 * Admin-Journey: Login → /admin → Dashboard mit PLU/Backshop + Umbenannte + Benutzerverwaltung.
 * Kein Zugang zu Super-Admin-Routen.
 */
test.describe('Admin-Journey', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await page.goto('/login')
    await page.getByLabel(/E-Mail-Adresse \/ Personalnummer/i).fill(email)
    await page.getByLabel(/^Passwort$/i).fill(password)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
  })

  test('Dashboard zeigt Admin-Bereiche', async ({ page }) => {
    await expect(page.getByText('PLU-Liste')).toBeVisible()
    await expect(page.getByText('Backshop')).toBeVisible()
    await expect(page.getByText('Benutzerverwaltung')).toBeVisible()
  })

  test('Benutzerverwaltung öffnen', async ({ page }) => {
    await page.getByText('Benutzerverwaltung').first().click()
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toBeVisible({ timeout: 10_000 })
  })

  test('Admin hat keinen Zugang zu /super-admin (Redirect)', async ({ page }) => {
    await page.goto('/super-admin')
    await expect(page).toHaveURL(/\/admin/)
  })
})
