import { test, expect } from '@playwright/test'

/**
 * Viewer-Journey: Login → Dashboard → PLU-Liste Obst → Backshop-Liste.
 * Keine Admin-Links sichtbar. Optional: /admin aufrufen → Redirect zu /viewer.
 */
test.describe('Viewer-Journey', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_VIEWER_EMAIL
    const password = process.env.E2E_VIEWER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await page.goto('/login')
    await page.getByLabel(/E-Mail-Adresse \/ Personalnummer/i).fill(email)
    await page.getByLabel(/^Passwort$/i).fill(password)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/viewer/, { timeout: 15_000 })
  })

  test('Dashboard zeigt PLU-Liste Karten', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'PLU-Liste', level: 2 })).toBeVisible()
    await expect(page.getByText('PLU-Liste Obst/Gemüse')).toBeVisible()
    await expect(page.getByText('PLU-Liste Backshop')).toBeVisible()
  })

  test('Klick auf PLU-Liste Obst öffnet Masterliste', async ({ page }) => {
    await page.getByText('PLU-Liste Obst/Gemüse').click()
    await expect(page).toHaveURL(/\/viewer\/masterlist/)
    await expect(page.getByRole('heading', { name: /PLU-Liste|Masterliste/i })).toBeVisible({ timeout: 10_000 })
  })

  test('Klick auf PLU-Liste Backshop öffnet Backshop-Liste', async ({ page }) => {
    await page.getByText('PLU-Liste Backshop').click()
    await expect(page).toHaveURL(/\/viewer\/backshop-list/)
  })

  test('Viewer hat keinen Zugang zu /admin (Redirect)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/viewer/)
  })
})
