import { test, expect } from '@playwright/test'

/**
 * Super-Admin-Journey: Login → /super-admin → Obst-Bereich → Backshop-Bereich → Benutzerverwaltung.
 * Einzelne Seiten nur ansteuern und prüfen, dass sie laden (kein 404).
 */
test.describe('Super-Admin-Journey', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_SUPER_ADMIN_EMAIL
    const password = process.env.E2E_SUPER_ADMIN_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await page.goto('/login')
    await page.getByLabel(/E-Mail-Adresse \/ Personalnummer/i).fill(email)
    await page.getByLabel(/^Passwort$/i).fill(password)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 15_000 })
  })

  test('Dashboard zeigt Super-Administration und drei Karten', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Super-Administration', level: 2 })).toBeVisible()
    await expect(page.getByText('Obst und Gemüse')).toBeVisible()
    await expect(page.getByText('Backshop')).toBeVisible()
    await expect(page.getByText('Benutzer')).toBeVisible()
  })

  test('Obst-Bereich öffnen: Bereichsseite mit Upload, Layout, Versionen', async ({ page }) => {
    await page.getByText('Obst und Gemüse').first().click()
    await expect(page).toHaveURL(/\/super-admin\/obst/)
    await expect(page.getByRole('heading', { name: 'Obst und Gemüse', level: 2 })).toBeVisible()
    await expect(page.getByText('PLU Upload')).toBeVisible()
    await expect(page.getByText('Layout')).toBeVisible()
  })

  test('Backshop-Bereich öffnen: Bereichsseite mit Backshop-Liste, Upload', async ({ page }) => {
    await page.getByText('Backshop').first().click()
    await expect(page).toHaveURL(/\/super-admin\/backshop/)
    await expect(page.getByRole('heading', { name: 'Backshop', level: 2 })).toBeVisible()
    await expect(page.getByText('Backshop Upload')).toBeVisible()
  })

  test('Benutzerverwaltung öffnen', async ({ page }) => {
    await page.getByText('Benutzer').first().click()
    await expect(page).toHaveURL(/\/super-admin\/users/)
    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toBeVisible({ timeout: 10_000 })
  })
})
