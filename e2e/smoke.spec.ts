import { test, expect } from '@playwright/test'

/**
 * Smoke-Test: App und Login-Seite erreichbar, erwartete Inhalte sichtbar.
 * Läuft ohne .env.e2e (keine Credentials nötig).
 * @smoke = Standard-Test (schnell, vor jedem Commit)
 */
test.describe('Smoke', () => {
  test('Login-Seite lädt und zeigt Titel Fier Hub @smoke', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Fier Hub', level: 1 })).toBeVisible()
    // Login-Formular sichtbar: Anmelden-Button (robuster als CardTitle/Text)
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
  })

  test('Root leitet nicht eingeloggte User zur Login-Seite um @smoke', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Geschützte Route /user leitet zur Login-Seite um @smoke', async ({ page }) => {
    await page.goto('/user')
    await expect(page).toHaveURL(/\/login/)
  })
})
