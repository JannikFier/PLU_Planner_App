import { test, expect } from '@playwright/test'

/**
 * User-Journey: Login → /user → Dashboard → Masterliste, Backshop, Eigenes, Ausgeblendete.
 * @extended = Vor Publish ausführen (braucht .env.e2e mit E2E_USER_*)
 */
test.describe('User-Journey @extended', () => {
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
    // Warte auf Dashboard-Inhalt (Store + Visibility laden auf localhost)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Willkommen', level: 2 })).toBeVisible({ timeout: 15_000 })
  })

  test('Dashboard zeigt Willkommen und Bereichskarten', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Willkommen', level: 2 })).toBeVisible()
    // .first() vermeidet Strict-Mode-Fehler bei mehreren Treffern (Titel + Beschreibung)
    await expect(page.getByText('Obst und Gemüse').first()).toBeVisible()
    await expect(page.getByText('Backshop').first()).toBeVisible()
  })

  test('Obst-Karte führt zur Masterliste', async ({ page }) => {
    // Karten-Titel (h3), nicht den Absatz "Wähle die Liste: Obst und Gemüse oder Backshop"
    await page.getByRole('heading', { name: 'Obst und Gemüse', level: 3 }).click()
    await expect(page).toHaveURL(/\/user\/masterlist/)
  })

  test('Masterliste: Seite lädt mit Inhalt', async ({ page }) => {
    await page.getByRole('heading', { name: 'Obst und Gemüse', level: 3 }).click()
    await expect(page).toHaveURL(/\/user\/masterlist/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'PLU Obst und Gemüse' })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Karte führt zur Backshop-Liste', async ({ page }) => {
    await page.getByRole('heading', { name: 'Backshop', level: 3 }).click()
    await expect(page).toHaveURL(/\/user\/backshop-list/)
  })

  test('Backshop-Liste: Seite lädt mit Inhalt', async ({ page }) => {
    await page.getByRole('heading', { name: 'Backshop', level: 3 }).click()
    await expect(page).toHaveURL(/\/user\/backshop-list/)
    await page.waitForLoadState('networkidle')
    // Backshop-Liste zeigt Überschrift oder leeren Zustand
    await expect(
      page.getByRole('heading', { name: 'PLU-Liste Backshop' })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('PDF-Button öffnet Export-Dialog (wenn Version vorhanden)', async ({ page }) => {
    await page.getByRole('heading', { name: 'Obst und Gemüse', level: 3 }).click()
    await expect(page).toHaveURL(/\/user\/masterlist/)
    await page.waitForLoadState('networkidle')
    const pdfBtn = page.getByRole('button', { name: /PDF/ })
    if (await pdfBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pdfBtn.click()
      await expect(page.getByText(/Herunterladen|Drucken|KW/)).toBeVisible({ timeout: 5_000 })
    }
  })

  test('User hat keinen Zugang zu /super-admin (Redirect)', async ({ page }) => {
    await page.goto('/super-admin')
    await expect(page).toHaveURL(/\/user/)
  })

  // ─── Phase 2: Alle User-Seiten laden ───
  test('Eigene & Ausgeblendete: Seite lädt', async ({ page }) => {
    await page.goto('/user/hidden-items')
    await expect(page).toHaveURL(/\/user\/hidden-items/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene & Ausgeblendete' })).toBeVisible({ timeout: 15_000 })
  })

  test('Eigene Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/user/custom-products')
    await expect(page).toHaveURL(/\/user\/custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene Produkte' })).toBeVisible({ timeout: 15_000 })
  })

  test('Ausgeblendete Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/user/hidden-products')
    await expect(page).toHaveURL(/\/user\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte' })).toBeVisible({ timeout: 15_000 })
  })

  test('Werbung: Seite lädt', async ({ page }) => {
    await page.goto('/user/offer-products')
    await expect(page).toHaveURL(/\/user\/offer-products/)
    await page.waitForLoadState('networkidle')
    // level: 2 = nur h2, nicht h4 "Keine Produkte in der Werbung" (Strict-Mode)
    await expect(page.getByRole('heading', { name: 'Produkte in der Werbung', level: 2 })).toBeVisible({ timeout: 15_000 })
  })

  test('Umbenannte Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/user/renamed-products')
    await expect(page).toHaveURL(/\/user\/renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte' })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Eigene Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/user/backshop-custom-products')
    await expect(page).toHaveURL(/\/user\/backshop-custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene Produkte (Backshop)' })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Ausgeblendete: Seite lädt', async ({ page }) => {
    await page.goto('/user/backshop-hidden-products')
    await expect(page).toHaveURL(/\/user\/backshop-hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte (Backshop)' })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Werbung: Seite lädt', async ({ page }) => {
    await page.goto('/user/backshop-offer-products')
    await expect(page).toHaveURL(/\/user\/backshop-offer-products/)
    await page.waitForLoadState('networkidle')
    // level: 2 = nur h2, nicht h4 "Keine Produkte in der Werbung" (Strict-Mode)
    await expect(page.getByRole('heading', { name: 'Produkte in der Werbung (Backshop)', level: 2 })).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Umbenannte: Seite lädt', async ({ page }) => {
    await page.goto('/user/backshop-renamed-products')
    await expect(page).toHaveURL(/\/user\/backshop-renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte (Backshop)' })).toBeVisible({ timeout: 15_000 })
  })
})
