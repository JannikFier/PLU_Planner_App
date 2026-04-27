import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2.3: Smoke-Test für die `data-tour`-Anker auf den Obst-Konfigurationsseiten
 * (Konfig-Hub, LayoutSettings, Rules, Obst-Warengruppen-Workbench) inkl. Sub-Dialoge
 * und DnD-Griffe (Desktop + Mobile).
 *
 * Ziel: Renderpfad jeder Seite + ihrer Top-Level-Anker bleibt erreichbar.
 * Datenabhaengige Anker (DnD-Griffe, "first-handle"-Markierungen) werden weich
 * geprueft, damit die Tests in unterschiedlichsten Marktstaenden stabil bleiben.
 *
 * @extended — benötigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2.3 Anchors @extended', () => {
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

  test('Konfig-Hub: Wrapper + drei Karten erreichbar', async ({ page }) => {
    await page.goto('/admin/obst/konfiguration')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="obst-konfig-hub-layout-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-hub-rules-card"]')).toBeAttached()

    // Warengruppen-Karte ist nur sichtbar, wenn isByBlock aktiv ist (Layout-Setting).
    const wgCard = page.locator('[data-tour="obst-konfig-hub-warengruppen-card"]')
    if ((await wgCard.count()) > 0) {
      await expect(wgCard).toBeAttached()
    }
  })

  test('LayoutSettingsPage: Wrapper + alle Cards inkl. Vorschau attached', async ({ page }) => {
    await page.goto('/admin/layout')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-konfig-layout-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="obst-konfig-layout-display-mode-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-layout-sort-mode-card"]'),
    ).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-layout-flow-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-layout-fonts-card"]')).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-layout-mark-duration-card"]'),
    ).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-layout-kw-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-layout-features-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-layout-preview"]')).toBeAttached()

    // Mark-Duration-Selects sind in eigenen Wrappern.
    await expect(
      page.locator('[data-tour="obst-konfig-layout-mark-duration-red"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-layout-mark-duration-yellow"]'),
    ).toBeAttached()

    // Save-Status erscheint nach erstem Persist-Zyklus; weich pruefen.
    const saveStatus = page.locator('[data-tour="obst-konfig-layout-save-status"]')
    if ((await saveStatus.count()) > 0) {
      await expect(saveStatus).toBeAttached()
    }
  })

  test('LayoutPreview: mindestens eine Variante attached', async ({ page }) => {
    await page.goto('/admin/layout')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="obst-konfig-layout-page"]')).toBeAttached({
      timeout: 25_000,
    })

    // Eine der Vorschau-Varianten muss da sein (empty | mixed | stueck/gewicht).
    const empty = page.locator('[data-tour="obst-konfig-layout-preview-empty"]')
    const mixed = page.locator('[data-tour="obst-konfig-layout-preview-mixed"]')
    const stueck = page.locator('[data-tour="obst-konfig-layout-preview-stueck"]')
    const gewicht = page.locator('[data-tour="obst-konfig-layout-preview-gewicht"]')

    const total =
      (await empty.count()) +
      (await mixed.count()) +
      (await stueck.count()) +
      (await gewicht.count())

    expect(total).toBeGreaterThan(0)
  })

  test('RulesPage: Wrapper + Bezeichnungsregeln-Card + Add-Button', async ({ page }) => {
    await page.goto('/admin/rules')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-konfig-rules-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="obst-konfig-rules-keywords-card"]'),
    ).toBeAttached()
    await expect(page.locator('[data-tour="obst-konfig-rules-add-button"]')).toBeAttached()

    const badgeList = page.locator('[data-tour="obst-konfig-rules-badge-list"]')
    if ((await badgeList.count()) > 0) {
      await expect(badgeList).toBeAttached()
    }
  })

  test('RulesPage: SchlagwortManager-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/rules')
    await page.waitForLoadState('networkidle')

    await page.locator('[data-tour="obst-konfig-rules-add-button"]').first().click()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-dialog"]'),
    ).toBeAttached({ timeout: 5_000 })
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-input"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-submit"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-position-front"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-position-back"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-close"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-rules-schlagwort-apply-all"]'),
    ).toBeAttached()
  })

  test('Block-Sort-URL: Redirect zur Warengruppen-Workbench', async ({ page }) => {
    await page.goto('/admin/block-sort')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/obst-warengruppen/, { timeout: 15_000 })
    await expect(page.locator('[data-tour="obst-konfig-warengruppen-page"]')).toBeAttached({
      timeout: 15_000,
    })
    const panel = page.locator('[data-tour="obst-konfig-warengruppen-panel"]')
    const layoutHint = page.locator('[data-tour="obst-konfig-warengruppen-layout-hint"]')
    const infoCard = page.locator('[data-tour="obst-konfig-warengruppen-info-card"]')
    expect((await panel.count()) + (await layoutHint.count()) + (await infoCard.count())).toBeGreaterThan(0)
  })

  test('ObstWarengruppenPage: Wrapper + Workbench-Anker', async ({ page }) => {
    await page.goto('/admin/obst-warengruppen')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('[data-tour="obst-konfig-warengruppen-page"]'),
    ).toBeAttached({ timeout: 15_000 })

    const panel = page.locator('[data-tour="obst-konfig-warengruppen-panel"]')
    const infoCard = page.locator('[data-tour="obst-konfig-warengruppen-info-card"]')
    const total = (await panel.count()) + (await infoCard.count())
    expect(total).toBeGreaterThan(0)

    if ((await panel.count()) > 0) {
      await expect(page.locator('[data-testid="obst-warengruppen-panel-root"]')).toBeAttached()
      await expect(
        page.locator('[data-tour="obst-konfig-warengruppen-groups-card"]'),
      ).toBeAttached()
      await expect(
        page.locator('[data-tour="obst-konfig-warengruppen-products-card"]'),
      ).toBeAttached()
    }
  })

  test('Mobile-Variante: Warengruppen-Workbench + Konfig-Hub erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/admin/obst/konfiguration')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="obst-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })

    await page.goto('/admin/block-sort')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/obst-warengruppen/, { timeout: 15_000 })
    await expect(page.locator('[data-tour="obst-konfig-warengruppen-page"]')).toBeAttached({
      timeout: 15_000,
    })
    const panelRoot = page.locator('[data-testid="obst-warengruppen-panel-root"]')
    if ((await panelRoot.count()) > 0) {
      await expect(panelRoot.first()).toBeAttached()
    }
  })
})
