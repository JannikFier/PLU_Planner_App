import { test, expect } from '@playwright/test'

/**
 * Auth und Redirect: Nicht eingeloggt → Login; nach Login → richtiges Dashboard.
 * Für "nach Login" wird E2E_VIEWER_EMAIL + E2E_VIEWER_PASSWORD genutzt (falls gesetzt).
 */
test.describe('Auth & Redirect', () => {
  test('Nicht eingeloggt: / leitet zu /login um', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Nicht eingeloggt: /user leitet zu /login um', async ({ page }) => {
    await page.goto('/user')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Nach Login: Viewer landet auf /viewer', async ({ page }) => {
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
})
