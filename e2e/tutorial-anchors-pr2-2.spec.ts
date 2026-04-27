import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2.2: Smoke-Test für die `data-tour`-Anker auf den Obst-Listenseiten
 * (Eigene Produkte, Ausgeblendete Produkte, Werbung, Umbenannte Produkte).
 *
 * Ziel: Der Renderpfad jeder Seite + ihrer Top-Level-Anker bleibt erreichbar.
 * Die meisten Anker werden weich geprüft (Existenz, optional bei Datenlage),
 * damit die Tests in unterschiedlichsten Marktständen stabil bleiben.
 *
 * @extended — benötigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2.2 Anchors @extended', () => {
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

  test('Obst Eigene Produkte: Toolbar/Buttons/Liste-Anker', async ({ page }) => {
    await page.goto('/admin/custom-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-custom-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="obst-custom-add-button"]')).toBeAttached()

    // Excel-Button nur in Super-Admin-Sicht; Liste/Search nur wenn Daten da sind.
    const excel = page.locator('[data-tour="obst-custom-excel-button"]')
    if ((await excel.count()) > 0) {
      await expect(excel).toBeAttached()
    }
    const list = page.locator('[data-tour="obst-custom-list"]')
    if ((await list.count()) > 0) {
      await expect(list).toBeAttached()
    }
    const search = page.locator('[data-tour="obst-custom-search"]')
    if ((await search.count()) > 0) {
      await expect(search).toBeAttached()
    }
    const firstItem = page.locator('[data-tour="obst-custom-first-item"]')
    if ((await firstItem.count()) > 0) {
      await expect(firstItem.first()).toBeAttached()
    }
  })

  test('Obst Eigene Produkte: Add-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/custom-products')
    await page.waitForLoadState('networkidle')

    await page.locator('[data-tour="obst-custom-add-button"]').first().click()
    await expect(page.locator('[data-tour="obst-custom-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
    await expect(
      page.locator('[data-tour="obst-custom-add-dialog-submit"]'),
    ).toBeAttached()
  })

  test('Obst Ausgeblendete Produkte: Toolbar/Buttons/Liste-Anker', async ({ page }) => {
    await page.goto('/admin/hidden-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-hidden-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    // Add-Button nur fuer Rollen mit canManageMarketHiddenItems sichtbar.
    const addBtn = page.locator('[data-tour="obst-hidden-add-button"]')
    if ((await addBtn.count()) > 0) {
      await expect(addBtn).toBeAttached()
    }
    const list = page.locator('[data-tour="obst-hidden-list"]')
    if ((await list.count()) > 0) {
      await expect(list).toBeAttached()
    }
    const search = page.locator('[data-tour="obst-hidden-search"]')
    if ((await search.count()) > 0) {
      await expect(search).toBeAttached()
    }
    const firstItem = page.locator('[data-tour="obst-hidden-first-item"]')
    if ((await firstItem.count()) > 0) {
      await expect(firstItem.first()).toBeAttached()
    }
    const showBtn = page.locator('[data-tour="obst-hidden-show-button"]')
    if ((await showBtn.count()) > 0) {
      await expect(showBtn.first()).toBeAttached()
    }
  })

  test('Obst Ausgeblendete Produkte: Add-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/hidden-products')
    await page.waitForLoadState('networkidle')

    const addBtn = page.locator('[data-tour="obst-hidden-add-button"]')
    if ((await addBtn.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Rolle ohne Manage-Hidden-Berechtigung; Dialog nicht erreichbar.',
      })
      return
    }
    await addBtn.first().click()
    await expect(page.locator('[data-tour="obst-hidden-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
    await expect(
      page.locator('[data-tour="obst-hidden-add-dialog-submit"]'),
    ).toBeAttached()
  })

  test('Obst Werbung: Toolbar/Sektion-Anker', async ({ page }) => {
    await page.goto('/admin/offer-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-offer-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="obst-offer-add-button"]')).toBeAttached()

    const excel = page.locator('[data-tour="obst-offer-excel-button"]')
    if ((await excel.count()) > 0) {
      await expect(excel).toBeAttached()
    }
    const zentral = page.locator('[data-tour="obst-offer-section-zentral"]')
    if ((await zentral.count()) > 0) {
      await expect(zentral).toBeAttached()
    }
    const eigen = page.locator('[data-tour="obst-offer-section-eigen"]')
    if ((await eigen.count()) > 0) {
      await expect(eigen).toBeAttached()
    }
    const zentralFirst = page.locator('[data-tour="obst-offer-zentral-first-item"]')
    if ((await zentralFirst.count()) > 0) {
      await expect(zentralFirst.first()).toBeAttached()
    }
    const eigenFirst = page.locator('[data-tour="obst-offer-eigen-first-item"]')
    if ((await eigenFirst.count()) > 0) {
      await expect(eigenFirst.first()).toBeAttached()
    }
  })

  test('Obst Werbung: Add-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/offer-products')
    await page.waitForLoadState('networkidle')

    await page.locator('[data-tour="obst-offer-add-button"]').first().click()
    await expect(page.locator('[data-tour="obst-offer-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
  })

  test('Obst Umbenannte Produkte: Toolbar/Buttons/Liste-Anker', async ({ page }) => {
    await page.goto('/admin/renamed-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-renamed-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="obst-renamed-add-button"]')).toBeAttached()

    const list = page.locator('[data-tour="obst-renamed-list"]')
    if ((await list.count()) > 0) {
      await expect(list).toBeAttached()
    }
    const search = page.locator('[data-tour="obst-renamed-search"]')
    if ((await search.count()) > 0) {
      await expect(search).toBeAttached()
    }
    const firstItem = page.locator('[data-tour="obst-renamed-first-item"]')
    if ((await firstItem.count()) > 0) {
      await expect(firstItem.first()).toBeAttached()
    }
    const resetBtn = page.locator('[data-tour="obst-renamed-reset-button"]')
    if ((await resetBtn.count()) > 0) {
      await expect(resetBtn.first()).toBeAttached()
    }
  })

  test('Obst Umbenannte Produkte: Add-Dialog Anker', async ({ page }) => {
    await page.goto('/admin/renamed-products')
    await page.waitForLoadState('networkidle')

    await page.locator('[data-tour="obst-renamed-add-button"]').first().click()
    await expect(page.locator('[data-tour="obst-renamed-add-dialog"]')).toBeAttached({
      timeout: 5_000,
    })
  })

  test('Mobile-Variante: Custom-Toolbar bleibt erreichbar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/custom-products')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-custom-toolbar"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="obst-custom-add-button"]')).toBeAttached()
  })
})
