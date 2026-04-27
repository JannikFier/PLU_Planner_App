import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2: Smoke-Test für die in dieser PR ergänzten `data-tour`-Anker.
 *
 * Ziel ist nicht, Tutorial-Verhalten zu verifizieren, sondern lediglich, dass
 * jeder neu hinzugefügte DOM-Anker auf dem entsprechenden Screen erreichbar
 * ist (`toBeAttached`). Dadurch fällt früh auf, wenn ein Refactor einen
 * Anker versehentlich entfernt.
 *
 * @extended — benötigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2 Anchors @extended', () => {
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
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
    await expect(
      page.getByRole('heading', { name: 'Administration', level: 2 }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('Dashboard- und Header-Anker existieren', async ({ page }) => {
    // Hub-Anker liegen unter /admin/obst bzw. /admin/backshop; auf /admin die Einstiegskarten.
    await expect(page.locator('[data-tour="dashboard-card-obst"]')).toBeAttached({
      timeout: 10_000,
    })
    await expect(page.locator('[data-tour="dashboard-card-backshop"]')).toBeAttached()

    await page.locator('[data-tour="profile-menu"]').click()
    await expect(page.locator('[data-tour="header-testmode-menu-item"]')).toBeAttached({
      timeout: 5_000,
    })
    await expect(page.locator('[data-tour="header-logout"]')).toBeAttached()
    // header-store-switcher nur, wenn der Account mehrere Märkte hat. In der
    // Default-E2E-Umgebung mit nur einem Markt fehlt der Switcher absichtlich
    // — daher prüfen wir den Anker nur weich.
    const storeSwitcher = page.locator('[data-tour="header-store-switcher"]')
    if (await storeSwitcher.count() > 0) {
      await expect(storeSwitcher).toBeAttached()
    }
  })

  test('Obst-Masterliste-Anker existieren', async ({ page }) => {
    await page.goto('/admin/masterlist')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="obst-master-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="masterlist-context-line"]')).toBeAttached()
    await expect(page.locator('[data-tour="masterlist-toolbar-werbung"]')).toBeAttached()
    await expect(page.locator('[data-tour="masterlist-toolbar-umbenennen"]')).toBeAttached()
    await expect(page.locator('[data-tour="masterlist-toolbar-pdf"]')).toBeAttached()
  })

  test('PLU-Tabelle: Listen-Header-Anker (MIXED oder Stück/Gewicht)', async ({ page }) => {
    await page.goto('/admin/masterlist')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="obst-master-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    // MIXED: ein Banner `plu-table-header-mixed`. SEPARATED: Stück- und/oder Gewicht-Banner.
    const mixed = page.locator('[data-tour="plu-table-header-mixed"]')
    const stueck = page.locator('[data-tour="plu-table-header-stueck"]')
    const gewicht = page.locator('[data-tour="plu-table-header-gewicht"]')
    const total =
      (await mixed.count()) + (await stueck.count()) + (await gewicht.count())
    const emptyList = page.getByText('Keine PLU-Einträge für diese Kalenderwoche vorhanden.')
    const hasEmpty = await emptyList.isVisible().catch(() => false)
    expect(total > 0 || hasEmpty).toBe(true)
    // Erste Datenzeile ebenfalls weich prüfen — nur falls Daten geladen sind.
    const firstRow = page.locator('[data-tour="plu-table-first-data-row"]')
    if ((await firstRow.count()) > 0) {
      await expect(firstRow.first()).toBeAttached()
    }
  })

  test('Find-in-Page-Leiste hat Anker, sobald geöffnet', async ({ page }) => {
    await page.goto('/admin/masterlist')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-tour="masterlist-search"]').click()
    await expect(page.locator('[data-tour="plu-find-in-page-bar"]')).toBeAttached({
      timeout: 5_000,
    })
  })

  test('ChangePassword-Anker existieren', async ({ page }) => {
    await page.goto('/change-password')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="change-password-form"]')).toBeAttached({
      timeout: 10_000,
    })
    await expect(page.locator('[data-tour="change-password-new"]')).toBeAttached()
    await expect(page.locator('[data-tour="change-password-confirm"]')).toBeAttached()
    await expect(page.locator('[data-tour="change-password-submit"]')).toBeAttached()
  })
})

test.describe('Tutorial PR 2 Anchors – Mobile @extended', () => {
  test.use({ viewport: { width: 390, height: 844 } })

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
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
  })

  test('Mobile: Hamburger-Menü-Anker auf Masterliste', async ({ page }) => {
    await page.goto('/admin/masterlist')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="plu-list-mobile-actions"]')).toBeAttached({
      timeout: 15_000,
    })
  })
})
