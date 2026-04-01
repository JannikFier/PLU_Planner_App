import { test, expect } from '@playwright/test'

/**
 * Admin-Journey: Login → /admin → Dashboard mit PLU/Backshop + Benutzerverwaltung.
 * @extended = Vor Publish ausführen (braucht .env.e2e mit E2E_ADMIN_*)
 */
test.describe('Admin-Journey @extended', () => {
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
    // Warte auf Dashboard-Inhalt (Store + Visibility laden auf localhost)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Administration', level: 2 })).toBeVisible({ timeout: 15_000 })
  })

  test('Dashboard zeigt Admin-Bereiche', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Obst und Gemüse' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Backshop' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Benutzer' })).toBeVisible()
  })

  test('Benutzerverwaltung öffnen', async ({ page }) => {
    await page.getByRole('heading', { name: 'Benutzer' }).click()
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toBeVisible({ timeout: 10_000 })
  })

  test('Benutzerverwaltung: Neuer-Benutzer-Button sichtbar', async ({ page }) => {
    await page.getByRole('heading', { name: 'Benutzer' }).click()
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('button', { name: 'Neuer Benutzer' })).toBeVisible({ timeout: 10_000 })
  })

  test('Admin-Masterliste: Seite lädt', async ({ page }) => {
    await page.getByRole('heading', { name: 'Obst und Gemüse' }).click()
    await expect(page).toHaveURL(/\/admin\/obst/)
    await page.getByRole('heading', { name: 'PLU-Liste' }).click()
    await expect(page).toHaveURL(/\/admin\/masterlist/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'PLU Obst und Gemüse' })).toBeVisible({ timeout: 15_000 })
  })

  test('Admin hat keinen Zugang zu /super-admin (Redirect)', async ({ page }) => {
    await page.goto('/super-admin')
    await expect(page).toHaveURL(/\/admin/)
  })

  // ─── Phase 3: Alle Admin-Seiten laden ───
  test('Eigene & Ausgeblendete: Seite lädt', async ({ page }) => {
    await page.goto('/admin/hidden-items')
    await expect(page).toHaveURL(/\/admin\/hidden-items/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene & Ausgeblendete' })).toBeVisible({ timeout: 15_000 })
  })

  test('Umbenannte Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/admin/renamed-products')
    await expect(page).toHaveURL(/\/admin\/renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte' })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Liste: Seite lädt', async ({ page }) => {
    await page.goto('/admin/backshop-list')
    await expect(page).toHaveURL(/\/admin\/backshop-list/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'PLU-Liste Backshop' })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Umbenannte: Seite lädt', async ({ page }) => {
    await page.goto('/admin/backshop-renamed-products')
    await expect(page).toHaveURL(/\/admin\/backshop-renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte (Backshop)' })).toBeVisible({ timeout: 15_000 })
  })
})
