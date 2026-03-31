import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Keine horizontale Scrollbreite auf kritischen User-Routen (Handy + Tablet).
 * Läuft in zwei Playwright-Projekten: mobile-chromium (iPhone 13) und
 * tablet-chromium (iPad Pro 11) – siehe playwright.config.
 *
 * Bei neuen breiten Tabellen/Listen unter /user/** diese Datei ergänzen (siehe docs/TESTING.md).
 * @mobile – optional vor Publish zusammen mit test:e2e:full
 */
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
  })

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

  test('Dashboard: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user')
    await expect(page).toHaveURL(/\/user\/?$/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Willkommen', level: 2 })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('PLU-Masterliste: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/masterlist')
    await expect(page).toHaveURL(/\/user\/masterlist/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'PLU-Masterliste' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop-Liste: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-list')
    await expect(page).toHaveURL(/\/user\/backshop-list/)
    await page.waitForLoadState('networkidle')
    await expect(
      page
        .getByRole('heading', { name: 'PLU-Liste Backshop' })
        .or(page.getByText('Keine Kalenderwoche'))
        .or(page.getByText('Keine PLU-Daten')),
    ).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
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
  })

  test('Ausgeblendete Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/hidden-products')
    await expect(page).toHaveURL(/\/user\/hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Produkte in der Werbung: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/offer-products')
    await expect(page).toHaveURL(/\/user\/offer-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Produkte in der Werbung', level: 2 })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
  })

  test('Umbenannte Produkte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/renamed-products')
    await expect(page).toHaveURL(/\/user\/renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte' })).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop Ausgeblendete: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-hidden-products')
    await expect(page).toHaveURL(/\/user\/backshop-hidden-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Ausgeblendete Produkte (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop Werbung: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-offer-products')
    await expect(page).toHaveURL(/\/user\/backshop-offer-products/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByRole('heading', { name: 'Produkte in der Werbung (Backshop)', level: 2 }),
    ).toBeVisible({ timeout: 15_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('Backshop Umbenannte: keine horizontale Scrollbreite', async ({ page }) => {
    await page.goto('/user/backshop-renamed-products')
    await expect(page).toHaveURL(/\/user\/backshop-renamed-products/)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Umbenannte Produkte (Backshop)' })).toBeVisible({
      timeout: 15_000,
    })
    await expectNoHorizontalOverflow(page)
  })
})
