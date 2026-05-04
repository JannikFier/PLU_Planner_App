import { test, expect } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * Viewer-Journey: Login → Dashboard → PLU-Liste Obst → Backshop-Liste.
 * @extended = Vor Publish ausführen (braucht .env.e2e mit E2E_VIEWER_*)
 */
test.describe('Viewer-Journey @extended', () => {
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
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
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

  test('Klick auf PLU-Liste Backshop öffnet Backshop-Hub, dann PLU-Liste', async ({ page }) => {
    await page.getByText('PLU-Liste Backshop').click()
    await expect(page).toHaveURL(/\/viewer\/backshop\/?$/)
    await page.getByRole('navigation', { name: 'Backshop-Bereich' }).getByRole('link', { name: 'PLU-Liste' }).click()
    await expect(page).toHaveURL(/\/viewer\/backshop-list/)
  })

  test('Viewer hat keinen Zugang zu /admin (Redirect)', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/viewer/)
  })
})
