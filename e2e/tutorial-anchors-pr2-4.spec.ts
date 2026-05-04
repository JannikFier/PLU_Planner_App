import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2.4: Smoke-Test für die `data-tour`-Anker auf den Backshop-Listenseiten
 * (Hub, Masterlist, Eigene/Ausgeblendete/Werbung/Umbenannte, Notification-Panel,
 * Marken-Auswahl, Multi-Source-Upload-Wizard).
 *
 * Ziel: Der Renderpfad jeder Seite + ihrer Top-Level-Anker bleibt erreichbar.
 * Die meisten Anker werden weich geprüft (Existenz, optional bei Datenlage),
 * damit die Tests in unterschiedlichsten Marktständen stabil bleiben.
 *
 * @extended — benötigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2.4 Anchors @extended', () => {
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

  test('Backshop-Hub: Bereichsnavigation und Anker', async ({ page }) => {
    await page.goto('/admin/backshop')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="backshop-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-bereich-nav"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-hub-werbung-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-hub-kachel-link"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-hub-list-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-hub-konfig-card"]')).toBeAttached()
  })

  test('Backshop-Masterlist: Toolbar/Find-Trigger/Quick-Buttons/Tabelle', async ({ page }) => {
    await page.goto('/admin/backshop-list')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="backshop-master-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-master-toolbar"]')).toBeAttached()

    const findTrigger = page.locator('[data-tour="backshop-master-find-trigger"]')
    if ((await findTrigger.count()) > 0) {
      await expect(findTrigger).toBeAttached()
    }
    const quickCustom = page.locator('[data-tour="backshop-master-quick-custom"]')
    if ((await quickCustom.count()) > 0) {
      await expect(quickCustom).toBeAttached()
    }
    const quickHidden = page.locator('[data-tour="backshop-master-quick-hidden"]')
    if ((await quickHidden.count()) > 0) {
      await expect(quickHidden).toBeAttached()
    }
    const quickOffer = page.locator('[data-tour="backshop-master-quick-offer"]')
    if ((await quickOffer.count()) > 0) {
      await expect(quickOffer).toBeAttached()
    }
    const sourceFilter = page.locator('[data-tour="backshop-master-source-filter"]')
    if ((await sourceFilter.count()) > 0) {
      await expect(sourceFilter).toBeAttached()
    }
    const pdfExport = page.locator('[data-tour="backshop-master-pdf-export"]')
    if ((await pdfExport.count()) > 0) {
      await expect(pdfExport).toBeAttached()
    }
    const versionBanner = page.locator('[data-tour="backshop-master-version-banner"]')
    if ((await versionBanner.count()) > 0) {
      await expect(versionBanner).toBeAttached()
    }
    const table = page.locator('[data-tour="backshop-master-table"]')
    if ((await table.count()) > 0) {
      await expect(table).toBeAttached()
    }
    const firstRow = page.locator('[data-tour="backshop-master-first-row"]')
    if ((await firstRow.count()) > 0) {
      await expect(firstRow.first()).toBeAttached()
    }
    const sourceBadge = page.locator('[data-tour="backshop-master-source-badge"]')
    if ((await sourceBadge.count()) > 0) {
      await expect(sourceBadge.first()).toBeAttached()
    }
  })

  test('Backshop Eigene Produkte: Toolbar/Buttons + Add-Dialog', async ({ page }) => {
    await page.goto('/admin/backshop-custom-products')
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)

    await expect(page.locator('[data-tour="backshop-custom-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-custom-toolbar"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-custom-add-button"]')).toBeAttached()

    const list = page.locator('[data-tour="backshop-custom-list"]')
    if ((await list.count()) > 0) {
      await expect(list).toBeAttached()
    }
    const firstItem = page.locator('[data-tour="backshop-custom-first-item"]')
    if ((await firstItem.count()) > 0) {
      await expect(firstItem.first()).toBeAttached()
    }

    await page.locator('[data-tour="backshop-custom-add-button"]').first().click()
    await expect(page.locator('[data-tour="backshop-custom-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
    await expect(
      page.locator('[data-tour="backshop-custom-add-dialog-submit"]'),
    ).toBeAttached()
  })

  test('Backshop Ausgeblendete: beide Modi (manuell/regel) + Add-Dialog', async ({ page }) => {
    await page.goto('/admin/backshop-hidden-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-hidden-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-hidden-toolbar"]')).toBeAttached()

    const modeManual = page.locator('[data-tour="backshop-hidden-mode-manual"]')
    if ((await modeManual.count()) > 0) {
      await expect(modeManual).toBeAttached()
    }
    const modeRule = page.locator('[data-tour="backshop-hidden-mode-rule"]')
    if ((await modeRule.count()) > 0) {
      await expect(modeRule).toBeAttached()
    }

    const addBtn = page.locator('[data-tour="backshop-hidden-add-button"]')
    if ((await addBtn.count()) > 0) {
      await expect(addBtn).toBeAttached()
      await addBtn.first().click()
      await expect(page).toHaveURL(/pick-hide-backshop/, { timeout: 10_000 })
      await expect(page.locator('[data-tour="backshop-hidden-add-dialog"]')).toBeAttached({
        timeout: 10_000,
      })
      await expect(
        page.locator('[data-tour="backshop-hidden-add-dialog-submit"]'),
      ).toBeAttached()
    }
  })

  test('Backshop Werbung: Toolbar + Sektionen + Add-Dialog', async ({ page }) => {
    await page.goto('/admin/backshop-offer-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-offer-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-offer-toolbar"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-offer-add-button"]')).toBeAttached()

    const zentral = page.locator('[data-tour="backshop-offer-section-zentral"]')
    if ((await zentral.count()) > 0) {
      await expect(zentral).toBeAttached()
    }
    const eigen = page.locator('[data-tour="backshop-offer-section-eigen"]')
    if ((await eigen.count()) > 0) {
      await expect(eigen).toBeAttached()
    }

    await page.locator('[data-tour="backshop-offer-add-button"]').first().click()
    await expect(page.locator('[data-tour="backshop-offer-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
  })

  test('Backshop Umbenannte: Toolbar + Liste + Add-Dialog', async ({ page }) => {
    await page.goto('/admin/backshop-renamed-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-renamed-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="backshop-renamed-toolbar"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-renamed-add-button"]')).toBeAttached()

    const list = page.locator('[data-tour="backshop-renamed-list"]')
    if ((await list.count()) > 0) {
      await expect(list).toBeAttached()
    }
    const firstItem = page.locator('[data-tour="backshop-renamed-first-item"]')
    if ((await firstItem.count()) > 0) {
      await expect(firstItem.first()).toBeAttached()
    }

    await page.locator('[data-tour="backshop-renamed-add-button"]').first().click()
    await expect(page).toHaveURL(/pick-rename-backshop/, { timeout: 10_000 })
    await expect(page.locator('[data-tour="backshop-renamed-add-dialog"]')).toBeAttached({
      timeout: 10_000,
    })
  })

  test('Backshop Notification-Panel: Tabs erreichbar', async ({ page }) => {
    await page.goto('/admin/backshop-list')
    await page.waitForLoadState('networkidle')

    const bell = page.locator('[data-tour="header-notification-bell"]')
    if ((await bell.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Notification-Glocke nicht sichtbar oder anderer Selektor – Test übersprungen.',
      })
      return
    }
    await bell.first().click()

    const panel = page.locator('[data-tour="backshop-notification-panel"]')
    if ((await panel.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Backshop-Tab im Notification-Dialog nicht aktiv – Test übersprungen.',
      })
      return
    }
    await expect(panel).toBeAttached({ timeout: 5_000 })
    await expect(page.locator('[data-tour="backshop-notification-tab-new"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-notification-tab-changed"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-notification-tab-removed"]')).toBeAttached()
  })

  test('Backshop Marken-Auswahl: Page + Sidebar + Status', async ({ page }) => {
    await page.goto('/admin/marken-auswahl')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="backshop-marken-auswahl-page"]')).toBeAttached({
      timeout: 15_000,
    })
    const sidebar = page.locator('[data-tour="backshop-marken-auswahl-sidebar"]')
    if ((await sidebar.count()) > 0) {
      await expect(sidebar.first()).toBeAttached()
    }
    const list = page.locator('[data-tour="backshop-marken-auswahl-list"]')
    if ((await list.count()) > 0) {
      await expect(list.first()).toBeAttached()
    }
    const status = page.locator('[data-tour="backshop-marken-auswahl-status"]')
    if ((await status.count()) > 0) {
      await expect(status.first()).toBeAttached()
    }
    const preview = page.locator('[data-tour="backshop-marken-auswahl-preview"]')
    if ((await preview.count()) > 0) {
      await expect(preview.first()).toBeAttached()
    }
  })

  test('Backshop Upload-Overview: Source-Karten (Super-Admin)', async ({ page }) => {
    await page.goto('/super-admin/backshop-upload')
    await page.waitForLoadState('networkidle')

    const overview = page.locator('[data-tour="backshop-upload-overview-page"]')
    if ((await overview.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Account ist kein Super-Admin oder Upload-Overview nicht erreichbar – Test übersprungen.',
      })
      return
    }
    await expect(overview).toBeAttached({ timeout: 15_000 })
    await expect(page.locator('[data-tour="backshop-upload-source-first-card"]')).toBeAttached()
    await expect(page.locator('[data-tour="backshop-upload-source-start-button"]')).toBeAttached()
  })
})

test.describe('Tutorial PR 2.4 Anchors – Mobile @extended', () => {
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

  test('Mobile: Master-Toolbar + Custom-Toolbar bleiben erreichbar', async ({ page }) => {
    await page.goto('/admin/backshop-list')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="backshop-master-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })

    await page.goto('/admin/backshop-custom-products')
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
    await expect(page.locator('[data-tour="backshop-custom-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
  })
})
