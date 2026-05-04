import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * Keine horizontale Scrollbreite auf kritischen User-Routen (Handy + Tablet).
 * Läuft in zwei Playwright-Projekten: mobile-chromium (iPhone 13) und
 * tablet-chromium (iPad Pro 11) – siehe playwright.config.
 *
 * Bei neuen breiten Tabellen/Listen unter /user/** diese Datei ergänzen (siehe docs/TESTING.md).
 * @mobile – optional vor Publish zusammen mit test:e2e:full
 */

/**
 * Prüft documentElement, body und main (DashboardLayout) – erfasst auch
 * Overflow nur im Hauptbereich, solange äußeres Fenster schmal bleibt.
 */
async function expectNoHorizontalOverflow(page: Page) {
  const deltas = await page.evaluate(() => {
    const delta = (el: Element | null) => (el ? el.scrollWidth - el.clientWidth : 0)
    const main = document.querySelector('main')
    return {
      html: delta(document.documentElement),
      body: delta(document.body),
      main: delta(main),
    }
  })
  expect(deltas.html, 'documentElement: Seite nicht breiter als Viewport').toBeLessThanOrEqual(1)
  expect(deltas.body, 'body: kein horizontales Übermaß').toBeLessThanOrEqual(1)
  expect(deltas.main, 'main: Inhaltsbereich nicht breiter als Viewport').toBeLessThanOrEqual(1)
}

/** Prüft ein konkretes Element (z. B. Listen-Wrapper mit data-testid) – fängt innere Überbreite. */
async function expectNoHorizontalOverflowInLocator(locator: Locator, label: string) {
  const delta = await locator.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(delta, `${label}: kein horizontales Übermaß`).toBeLessThanOrEqual(1)
}

test.describe('Mobile Layout @mobile @extended', () => {
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
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
  })

  test('Dashboard: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user')
    await expect(page).toHaveURL(/\/user\/?$/)
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
    await expect(page.getByRole('heading', { name: 'Willkommen', level: 2 })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('PLU-Masterliste: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/masterlist')
    await expect(page).toHaveURL(/\/user\/masterlist/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /PLU Obst und Gemüse/ })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop-Liste: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-list')
    await expect(page).toHaveURL(/\/user\/backshop-list/)
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
    await expect(
      page
        .getByRole('heading', { name: /PLU-Liste Backshop|PLU Backshop/ })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten')),
    ).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop-Kachel-Katalog: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-kacheln')
    await expect(page).toHaveURL(/\/user\/backshop-kacheln/)
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)
    await expect(page.getByRole('heading', { name: 'Backshop-Liste' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const gridRoot = page.locator('[data-testid="backshop-kachel-grid-root"]')
    if ((await gridRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(gridRoot.first(), 'backshop-kachel-grid-root')
    }
  })

  test('Eigene Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/custom-products')
    await expect(page).toHaveURL(/\/user\/custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Eigene Produkte Backshop: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-custom-products')
    await expect(page).toHaveURL(/\/user\/backshop-custom-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene Produkte (Backshop)' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Eigene & Ausgeblendete: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/hidden-items')
    await expect(page).toHaveURL(/\/user\/hidden-items/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Eigene & Ausgeblendete' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const hiddenSectionRoot = page.locator('[data-testid="hidden-products-scroll-root"]')
    if ((await hiddenSectionRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(
        hiddenSectionRoot.first(),
        'hidden-products-scroll-root (Eigene & Ausgeblendete – Abschnitt Ausgeblendete)',
      )
    }
  })

  test('Ausgeblendete Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/hidden-products')
    await expect(page).toHaveURL(/\/user\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const hiddenRoot = page.locator('[data-testid="hidden-products-scroll-root"]')
    if ((await hiddenRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(hiddenRoot.first(), 'hidden-products-scroll-root')
    }
  })

  test('Produkte in der Werbung: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/offer-products')
    await expect(page).toHaveURL(/\/user\/offer-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Produkte in der Werbung', level: 2 })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const centralRoot = page.locator('[data-testid="offer-central-campaign-scroll-root"]')
    if ((await centralRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(centralRoot.first(), 'offer-central-campaign-scroll-root')
    }
    const localRoot = page.locator('[data-testid="offer-local-advertising-scroll-root"]')
    if ((await localRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(localRoot.first(), 'offer-local-advertising-scroll-root')
    }
  })

  test('Umbenannte Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/renamed-products')
    await expect(page).toHaveURL(/\/user\/renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const renamedRoot = page.locator('[data-testid="renamed-products-scroll-root"]')
    if ((await renamedRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(renamedRoot.first(), 'renamed-products-scroll-root')
    }
  })

  test('Backshop Ausgeblendete: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-hidden-products')
    await expect(page).toHaveURL(/\/user\/backshop-hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const hiddenRoot = page.locator('[data-testid="hidden-products-scroll-root"]')
    if ((await hiddenRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(hiddenRoot.first(), 'hidden-products-scroll-root (Backshop)')
    }
  })

  test('Backshop Werbung: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-offer-products')
    await expect(page).toHaveURL(/\/user\/backshop-offer-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Produkte in der Werbung (Backshop)', level: 2 }),
    ).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const centralRoot = page.locator('[data-testid="backshop-offer-central-campaign-scroll-root"]')
    if ((await centralRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(
        centralRoot.first(),
        'backshop-offer-central-campaign-scroll-root',
      )
    }
    const localRoot = page.locator('[data-testid="backshop-offer-local-advertising-scroll-root"]')
    if ((await localRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(
        localRoot.first(),
        'backshop-offer-local-advertising-scroll-root',
      )
    }
  })

  test('Backshop Werbung bestellen (KW-Liste): keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-werbung')
    await expect(page).toHaveURL(/\/user\/backshop-werbung/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Werbung bestellen', level: 2 })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const kwListRoot = page.locator('[data-testid="backshop-werbung-kw-list"]')
    if ((await kwListRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(kwListRoot.first(), 'backshop-werbung-kw-list')
    }
  })

  test('Backshop Umbenannte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-renamed-products')
    await expect(page).toHaveURL(/\/user\/backshop-renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const renamedRoot = page.locator('[data-testid="renamed-products-scroll-root"]')
    if ((await renamedRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(renamedRoot.first(), 'renamed-products-scroll-root (Backshop)')
    }
  })

  test('Ausblenden-Picker: Footer-Buttons sichtbar (kurze Viewport-Höhe)', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 420 })
    await page.goto('/user/hidden-products')
    await expect(page).toHaveURL(/\/user\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte' })).toBeVisible({ timeout: 15_000 })
    const openBtn = page.getByRole('button', { name: 'Produkte ausblenden' })
    if ((await openBtn.count()) === 0) {
      testInfo.skip(true, 'Button „Produkte ausblenden“ nicht verfügbar (Rolle/Berechtigung)')
      return
    }
    await openBtn.click()
    await expect(page).toHaveURL(/\/user\/pick-hide-obst/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Produkte ausblenden', level: 2 })).toBeVisible({
      timeout: 10_000,
    })
    const cancel = page.getByRole('button', { name: 'Abbrechen' })
    const confirm = page.getByRole('button', { name: /Produkt.*ausblenden/ })
    await expect(cancel).toBeVisible()
    await expect(confirm).toBeVisible()
    // Vollseite: Footer sitzt unter der Liste — bei niedriger Höhe erst scrollen, dann im Viewport prüfen
    await cancel.scrollIntoViewIfNeeded()
    await expect(cancel).toBeInViewport()
    await expect(confirm).toBeInViewport()
  })
})

test.describe('Mobile Layout Super-Admin @mobile @extended', () => {
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
    await page.waitForLoadState('networkidle')
  })

  test('Super-Admin Ausgeblendete Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/super-admin/hidden-products')
    await expect(page).toHaveURL(/\/super-admin\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
    const hiddenRoot = page.locator('[data-testid="hidden-products-scroll-root"]')
    if ((await hiddenRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(hiddenRoot.first(), 'hidden-products-scroll-root (Super-Admin)')
    }
  })

  test('Super-Admin Warengruppen (Obst): keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/super-admin/obst-warengruppen')
    await expect(page).toHaveURL(/\/super-admin\/obst-warengruppen/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Warengruppen (Obst & Gemüse)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const wgRoot = page.locator('[data-testid="obst-warengruppen-panel-root"]')
    if ((await wgRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(wgRoot.first(), 'obst-warengruppen-panel-root')
    }
  })

  test('Super-Admin Warengruppen (Backshop): keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/super-admin/backshop-block-sort')
    await expect(page).toHaveURL(/\/super-admin\/backshop-block-sort/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Warengruppen (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const bsRoot = page.locator('[data-testid="backshop-warengruppen-panel-root"]')
    if ((await bsRoot.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(bsRoot.first(), 'backshop-warengruppen-panel-root')
    }
  })

  test('Super-Admin Gruppenregeln (Backshop): keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/super-admin/backshop-gruppenregeln')
    await expect(page).toHaveURL(/\/super-admin\/backshop-gruppenregeln/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Gruppenregeln (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
    const mobileList = page.locator('[data-testid="backshop-gruppenregeln-mobile-list"]')
    if ((await mobileList.count()) > 0) {
      await expectNoHorizontalOverflowInLocator(mobileList.first(), 'backshop-gruppenregeln-mobile-list')
    }
  })
})
