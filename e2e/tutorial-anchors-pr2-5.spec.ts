import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2.5: Smoke-Test fuer die `data-tour`-Anker auf den Backshop-Konfigurationsseiten
 * (Konfig-Hub, LayoutSettings + Preview, Rules + SchlagwortDialog, BlockSort +
 * Warengruppen-Panel inkl. Dialoge, Gruppenregeln) inkl. Mobile-Variante.
 *
 * Ziel: Renderpfad jeder Seite + ihrer Top-Level-Anker bleibt erreichbar.
 * Datenabhaengige Anker (DnD-Griffe, "first-row"-Markierungen, PDF-Card,
 * Schlagwort-Dialog-Position-Front/Back) werden weich geprueft, damit die Tests
 * in unterschiedlichsten Marktstaenden stabil bleiben.
 *
 * @extended — benoetigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2.5 Anchors @extended', () => {
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

  test('Konfig-Hub: Wrapper + vier Karten erreichbar', async ({ page }) => {
    await page.goto('/admin/backshop/konfiguration')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="backshop-konfig-hub-layout-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-hub-rules-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-hub-block-sort-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-hub-gruppenregeln-card"]'),
    ).toBeAttached()
  })

  test('LayoutSettingsPage: Wrapper + alle Cards inkl. Vorschau attached', async ({ page }) => {
    await page.goto('/admin/backshop-layout')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-konfig-layout-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-display-mode-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-flow-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-fonts-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-mark-duration-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-kw-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-features-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-preview"]'),
    ).toBeAttached()

    // Mark-Duration-Selects sind in eigenen Wrappern.
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-mark-duration-red"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-layout-mark-duration-yellow"]'),
    ).toBeAttached()

    // PDF-Card erscheint nur bei BY_BLOCK; weich pruefen.
    const pdfCard = page.locator('[data-tour="backshop-konfig-layout-pdf-card"]')
    if ((await pdfCard.count()) > 0) {
      await expect(pdfCard).toBeAttached()
      await expect(
        page.locator('[data-tour="backshop-konfig-layout-pdf-page-break"]'),
      ).toBeAttached()
    }

    // Save-Status erscheint nach erstem Persist-Zyklus; weich pruefen.
    const saveStatus = page.locator('[data-tour="backshop-konfig-layout-save-status"]')
    if ((await saveStatus.count()) > 0) {
      await expect(saveStatus).toBeAttached()
    }
  })

  test('LayoutPreview: mindestens eine Variante attached', async ({ page }) => {
    await page.goto('/admin/backshop-layout')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="backshop-konfig-layout-page"]')).toBeAttached({
      timeout: 25_000,
    })

    const empty = page.locator('[data-tour="backshop-konfig-layout-preview-empty"]')
    const block = page.locator('[data-tour="backshop-konfig-layout-preview-block"]')
    const alpha = page.locator(
      '[data-tour="backshop-konfig-layout-preview-alphabetical"]',
    )

    const total =
      (await empty.count()) + (await block.count()) + (await alpha.count())
    expect(total).toBeGreaterThan(0)
  })

  test('RulesPage: Wrapper + Bezeichnungsregeln-Card + Add-Button', async ({ page }) => {
    await page.goto('/admin/backshop-rules')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-konfig-rules-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-keywords-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-add-button"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-block-sort-link"]'),
    ).toBeAttached()

    const badgeList = page.locator('[data-tour="backshop-konfig-rules-badge-list"]')
    if ((await badgeList.count()) > 0) {
      await expect(badgeList).toBeAttached()
    }
  })

  test('RulesPage: SchlagwortManager-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/backshop-rules')
    await page.waitForLoadState('networkidle')

    await page
      .locator('[data-tour="backshop-konfig-rules-add-button"]')
      .first()
      .click()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-schlagwort-dialog"]'),
    ).toBeAttached({ timeout: 5_000 })
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-schlagwort-input"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-schlagwort-submit"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-schlagwort-close"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-rules-schlagwort-apply-all"]'),
    ).toBeAttached()

    // Position-Buttons + Active-List erscheinen erst nach Texteingabe / wenn Regeln existieren.
    const activeList = page.locator(
      '[data-tour="backshop-konfig-rules-schlagwort-active-list"]',
    )
    if ((await activeList.count()) > 0) {
      await expect(activeList).toBeAttached()
    }
  })

  test('BlockSortPage: Wrapper + Section oder Disabled-Hint attached', async ({ page }) => {
    await page.goto('/admin/backshop-block-sort')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('[data-tour="backshop-konfig-block-sort-page"]'),
    ).toBeAttached({ timeout: 15_000 })

    const section = page.locator('[data-tour="backshop-konfig-block-sort-section"]')
    const disabled = page.locator('[data-tour="backshop-konfig-block-sort-disabled-hint"]')
    const total = (await section.count()) + (await disabled.count())
    expect(total).toBeGreaterThan(0)

    if ((await section.count()) > 0) {
      await expect(
        page.locator('[data-tour="backshop-konfig-warengruppen-panel"]'),
      ).toBeAttached()
      await expect(
        page.locator('[data-tour="backshop-konfig-warengruppen-groups-card"]'),
      ).toBeAttached()
      await expect(
        page.locator('[data-tour="backshop-konfig-warengruppen-products-card"]'),
      ).toBeAttached()
      await expect(
        page.locator('[data-tour="backshop-konfig-warengruppen-products-search"]'),
      ).toBeAttached()
    }
  })

  test('Warengruppen-Panel: Add-Group-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/backshop-block-sort')
    await page.waitForLoadState('networkidle')

    const addBtn = page.locator(
      '[data-tour="backshop-konfig-warengruppen-group-add-button"]',
    )
    if ((await addBtn.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Panel nicht aktiv (Datenlage oder Sortierung).',
      })
      return
    }
    await addBtn.first().click()
    await expect(
      page.locator('[data-tour="backshop-konfig-warengruppen-create-dialog"]'),
    ).toBeAttached({ timeout: 5_000 })
    await expect(
      page.locator('[data-tour="backshop-konfig-warengruppen-create-dialog-submit"]'),
    ).toBeAttached()
  })

  test('GruppenregelnPage: Wrapper + Card + Tabelle attached', async ({ page }) => {
    await page.goto('/admin/backshop-gruppenregeln')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('[data-tour="backshop-konfig-gruppenregeln-page"]'),
    ).toBeAttached({ timeout: 15_000 })
    await expect(
      page.locator('[data-tour="backshop-konfig-gruppenregeln-marken-link"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-gruppenregeln-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="backshop-konfig-gruppenregeln-table"]'),
    ).toBeAttached()

    // Erste Zeile + Source-Select nur bei Daten; weich pruefen.
    const firstRow = page.locator(
      '[data-tour="backshop-konfig-gruppenregeln-first-row"]',
    )
    if ((await firstRow.count()) > 0) {
      await expect(firstRow.first()).toBeAttached()
      await expect(
        page.locator('[data-tour="backshop-konfig-gruppenregeln-source-select"]').first(),
      ).toBeAttached()
    }
  })

  test('Mobile-Variante: BlockSortPage + Gruppenregeln-Page erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/admin/backshop/konfiguration')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="backshop-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })

    await page.goto('/admin/backshop-block-sort')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('[data-tour="backshop-konfig-block-sort-page"]'),
    ).toBeAttached({ timeout: 15_000 })

    await page.goto('/admin/backshop-gruppenregeln')
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('[data-tour="backshop-konfig-gruppenregeln-page"]'),
    ).toBeAttached({ timeout: 15_000 })
  })
})
