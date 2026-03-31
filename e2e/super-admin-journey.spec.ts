import { test, expect } from '@playwright/test'

/**
 * Super-Admin-Journey: Login → Upload → Obst/Backshop-Bereich → Benutzerverwaltung.
 * @extended = Vor Publish ausführen (braucht .env.e2e mit E2E_SUPER_ADMIN_*)
 */
test.describe('Super-Admin-Journey @extended', () => {
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

  test('Dashboard zeigt Super-Administration mit Firmen & Upload', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Super-Administration', level: 2 })).toBeVisible()
    await expect(page.getByText('Firmen & Märkte')).toBeVisible()
    await expect(page.getByText('Upload')).toBeVisible()
  })

  test('Upload-Seite: Obst- und Backshop-Bereich wählbar', async ({ page }) => {
    await page.getByRole('heading', { name: 'Upload', level: 3 }).click()
    await expect(page).toHaveURL(/\/super-admin\/upload/)
    await expect(page.getByRole('heading', { name: 'Upload & Verwaltung', level: 2 })).toBeVisible()
    await expect(page.getByText('Obst & Gemüse')).toBeVisible()
    await expect(page.getByText('Backshop')).toBeVisible()
  })

  test('Obst-Bereich: PLU Upload und Versionen sichtbar', async ({ page }) => {
    await page.getByRole('heading', { name: 'Upload', level: 3 }).click()
    await expect(page).toHaveURL(/\/super-admin\/upload/)
    await page.getByRole('heading', { name: 'Obst & Gemüse', level: 3 }).click()
    await expect(page).toHaveURL(/\/super-admin\/obst/)
    await expect(page.getByRole('heading', { name: 'Obst und Gemüse', level: 2 })).toBeVisible()
    await expect(page.getByText('PLU Upload Obst/Gemüse')).toBeVisible()
    await expect(page.getByText('Versionen')).toBeVisible()
    await expect(page.getByText('Zentrale Werbung (Exit)')).toBeVisible()
  })

  test('Backshop-Bereich: Upload sichtbar', async ({ page }) => {
    await page.getByRole('heading', { name: 'Upload', level: 3 }).click()
    await expect(page).toHaveURL(/\/super-admin\/upload/)
    await page.getByRole('heading', { name: 'Backshop', level: 3 }).click()
    await expect(page).toHaveURL(/\/super-admin\/backshop/)
    await expect(page.getByRole('heading', { name: 'Backshop', level: 2 })).toBeVisible()
    await expect(page.getByText('Backshop Upload')).toBeVisible()
    await expect(page.getByText('Zentrale Werbung (Exit)')).toBeVisible()
  })

  test('Zentrale Werbung (Obst): Upload-Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/central-werbung/obst')
    await expect(page).toHaveURL(/\/super-admin\/central-werbung\/obst/)
    await expect(
      page.getByRole('heading', { name: 'Zentrale Werbung (Obst/Gemüse)', level: 2 }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Zentrale Werbung (Backshop): Upload-Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/central-werbung/backshop')
    await expect(page).toHaveURL(/\/super-admin\/central-werbung\/backshop/)
    await expect(
      page.getByRole('heading', { name: 'Zentrale Werbung (Backshop)', level: 2 }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Benutzerverwaltung erreichbar', async ({ page }) => {
    await page.goto('/super-admin/users')
    await expect(page).toHaveURL(/\/super-admin\/users/)
    await expect(page.getByRole('heading', { name: 'Benutzerverwaltung' })).toBeVisible({ timeout: 10_000 })
  })

  // ─── Phase 4: Alle Super-Admin-Seiten laden ───
  test('PLU-Upload-Seite: lädt', async ({ page }) => {
    await page.goto('/super-admin/plu-upload')
    await expect(page).toHaveURL(/\/super-admin\/plu-upload/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Excel-Upload' })
        .or(page.getByText(/Datei|Excel|hochladen/i))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Masterliste: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/masterlist')
    await expect(page).toHaveURL(/\/super-admin\/masterlist/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'PLU-Masterliste' })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Layout-Konfiguration: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/layout')
    await expect(page).toHaveURL(/\/super-admin\/layout/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Layout-Konfiguration' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Inhalt & Regeln: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/rules')
    await expect(page).toHaveURL(/\/super-admin\/rules/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Inhalt|Regeln|Bezeichnungsregeln/i })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Versionen: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/versions')
    await expect(page).toHaveURL(/\/super-admin\/versions/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Versionen|Kalenderwoche/i })
        .or(page.getByText('Versionen'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Liste: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-list')
    await expect(page).toHaveURL(/\/super-admin\/backshop-list/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'PLU-Liste Backshop' })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Upload: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-upload')
    await expect(page).toHaveURL(/\/super-admin\/backshop-upload/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Backshop|Upload|Excel/i })
        .or(page.getByText(/Datei|hochladen/i))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Layout: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-layout')
    await expect(page).toHaveURL(/\/super-admin\/backshop-layout/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Layout.*Backshop|Backshop.*Layout/i })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop-Versionen: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-versions')
    await expect(page).toHaveURL(/\/super-admin\/backshop-versions/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Versionen|Backshop/i })
        .or(page.getByText('Versionen'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Firmen & Märkte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/companies')
    await expect(page).toHaveURL(/\/super-admin\/companies/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /Firmen|Märkte/i })
        .or(page.getByText('Firmen'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Block-Sortierung: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/block-sort')
    await expect(page).toHaveURL(/\/super-admin\/block-sort/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /PLU-Liste bearbeiten|Block/i })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Eigene Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/custom-products')
    await expect(page).toHaveURL(/\/super-admin\/custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Eigene Produkte' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Eigene & Ausgeblendete: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/hidden-items')
    await expect(page).toHaveURL(/\/super-admin\/hidden-items/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Eigene & Ausgeblendete' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Ausgeblendete Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/hidden-products')
    await expect(page).toHaveURL(/\/super-admin\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Ausgeblendete Produkte' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Werbung: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/offer-products')
    await expect(page).toHaveURL(/\/super-admin\/offer-products/)
    await page.waitForLoadState('networkidle')
    // level: 2 = nur h2, nicht h4 "Keine Produkte in der Werbung" (Strict-Mode)
    await expect(
      page.getByRole('heading', { name: 'Produkte in der Werbung', level: 2 })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Umbenannte Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/renamed-products')
    await expect(page).toHaveURL(/\/super-admin\/renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Umbenannte Produkte' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Warengruppen: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-warengruppen')
    await expect(page).toHaveURL(/\/super-admin\/backshop-warengruppen/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Warengruppen bearbeiten' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Inhalt & Regeln: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-rules')
    await expect(page).toHaveURL(/\/super-admin\/backshop-rules/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Inhalt & Regeln (Backshop)' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Block-Sortierung: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-block-sort')
    await expect(page).toHaveURL(/\/super-admin\/backshop-block-sort/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: /PLU-Liste Backshop bearbeiten|Block/i })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Eigene Produkte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-custom-products')
    await expect(page).toHaveURL(/\/super-admin\/backshop-custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Eigene Produkte (Backshop)' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Ausgeblendete: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-hidden-products')
    await expect(page).toHaveURL(/\/super-admin\/backshop-hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Ausgeblendete Produkte (Backshop)' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Werbung: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-offer-products')
    await expect(page).toHaveURL(/\/super-admin\/backshop-offer-products/)
    await page.waitForLoadState('networkidle')
    // level: 2 = nur h2, nicht h4 "Keine Produkte in der Werbung" (Strict-Mode)
    await expect(
      page.getByRole('heading', { name: 'Produkte in der Werbung (Backshop)', level: 2 })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Backshop Umbenannte: Seite lädt', async ({ page }) => {
    await page.goto('/super-admin/backshop-renamed-products')
    await expect(page).toHaveURL(/\/super-admin\/backshop-renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Umbenannte Produkte (Backshop)' })
        .or(page.getByText('Kein Markt'))
    ).toBeVisible({ timeout: 15_000 })
  })
})
