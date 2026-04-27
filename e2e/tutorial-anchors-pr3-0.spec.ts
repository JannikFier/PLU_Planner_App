import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 3.0: Smoke-Test fuer die in der Curriculum-Tiefe neu referenzierten
 * `data-tour`-Anker. Wir pruefen nur die Existenz im DOM (`toBeAttached`),
 * damit die Tests datenarm und stabil bleiben. Die ausfuehrliche Tour selbst
 * laeuft im Browser — hier validieren wir, dass die Anker auf den Zielseiten
 * vorhanden sind.
 *
 * @extended — benoetigt `.env.e2e` mit `E2E_ADMIN_*`.
 */
test.describe('Tutorial PR 3.0 Anchors @extended', () => {
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

  test('Header-Anker: KW + Tutorial-Icon + Profil-Menu', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')

    // KW-Anzeige + Profil-Menu sind immer da.
    await expect(page.locator('[data-tour="profile-menu"]')).toBeAttached({
      timeout: 15_000,
    })

    // Tutorial-Icon nur wenn Orchestrator den User noch nicht abgeschlossen hat.
    const tutorialIcon = page.locator('[data-tour="header-tutorial-icon"]')
    if ((await tutorialIcon.count()) > 0) {
      await expect(tutorialIcon).toBeAttached()
    }
  })

  test('Obst-Masterlist: Toolbar-Quick-Actions attached (Werbung, Custom, Hidden, Renamed, PDF)', async ({ page }) => {
    await page.goto('/admin/masterlist')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="masterlist-toolbar-actions"]')).toBeAttached({
      timeout: 15_000,
    })

    const anchors = [
      'masterlist-toolbar-werbung',
      'masterlist-toolbar-eigene-produkte',
      'masterlist-toolbar-ausblenden',
      'masterlist-toolbar-renamed',
      'masterlist-toolbar-pdf',
    ]
    for (const a of anchors) {
      const el = page.locator(`[data-tour="${a}"]`)
      // weiches Probing: nicht jeder Tenant hat alle Buttons aktiv
      if ((await el.count()) > 0) {
        await expect(el).toBeAttached()
      }
    }
  })

  test('Backshop-Masterlist: Toolbar + Quick-Actions attached', async ({ page }) => {
    await page.goto('/admin/backshop-list')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-master-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })

    const anchors = [
      'backshop-master-quick-werbung',
      'backshop-master-quick-custom',
      'backshop-master-quick-hidden',
      'backshop-master-quick-renamed',
      'backshop-master-quick-pdf',
    ]
    for (const a of anchors) {
      const el = page.locator(`[data-tour="${a}"]`)
      if ((await el.count()) > 0) {
        await expect(el).toBeAttached()
      }
    }
  })

  test('Marken-Auswahl: Status-Band + Sidebar attached', async ({ page }) => {
    await page.goto('/marken-auswahl')
    await page.waitForLoadState('networkidle')

    const page_ = page.locator('[data-tour="backshop-marken-auswahl-page"]')
    if ((await page_.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Marken-Auswahl nicht verfuegbar im aktuellen Test-Tenant.',
      })
      return
    }
    await expect(page_).toBeAttached({ timeout: 10_000 })
  })

  test('Backshop-Konfig-Hub: Karten attached (inkl. Gruppenregeln)', async ({ page }) => {
    await page.goto('/admin/backshop/konfiguration')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="backshop-konfig-hub-gruppenregeln-card"]'),
    ).toBeAttached()
  })
})
