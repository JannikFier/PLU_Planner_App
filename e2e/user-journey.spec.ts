import { test, expect } from '@playwright/test'

/**
 * User-Journey: Login → /user → Dashboard → Masterliste, Backshop, Eigenes, Ausgeblendete.
 * Keine Links zu Layout/Versionen/Upload/Benutzerverwaltung. /super-admin → Redirect.
 */
test.describe('User-Journey', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await page.goto('/login')
    await page.getByLabel(/E-Mail-Adresse \/ Personalnummer/i).fill(email)
    await page.getByLabel(/^Passwort$/i).fill(password)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/user/, { timeout: 15_000 })
  })

  test('Dashboard zeigt Willkommen und Bereichskarten', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Willkommen', level: 2 })).toBeVisible()
    await expect(page.getByText('Obst und Gemüse')).toBeVisible()
    await expect(page.getByText('Backshop')).toBeVisible()
  })

  test('Obst-Karte führt zur Masterliste', async ({ page }) => {
    await page.getByText('Obst und Gemüse').first().click()
    await expect(page).toHaveURL(/\/user\/masterlist/)
  })

  test('Backshop-Karte führt zur Backshop-Liste', async ({ page }) => {
    await page.getByText('Backshop').first().click()
    await expect(page).toHaveURL(/\/user\/backshop-list/)
  })

  test('User hat keinen Zugang zu /super-admin (Redirect)', async ({ page }) => {
    await page.goto('/super-admin')
    await expect(page).toHaveURL(/\/user/)
  })
})
