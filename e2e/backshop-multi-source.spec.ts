import { test, expect } from '@playwright/test'

/**
 * Backshop Multi-Source: Marken-Tinder, Produktgruppen, Upload-Flows.
 * @smoke = Redirects/Routen ohne Credentials
 * @extended = Login-pflichtige Szenarien (braucht .env.e2e)
 */
test.describe('Backshop Multi-Source', () => {
  test('Neue Marken-Tinder-Route ohne Login: Redirect auf /login @smoke', async ({ page }) => {
    await page.goto('/user/marken-auswahl')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Neue Harry-Upload-Route (Super-Admin) ohne Login: Redirect auf /login @smoke', async ({ page }) => {
    await page.goto('/super-admin/backshop-harry-upload')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Neue Aryzta-Upload-Route (Super-Admin) ohne Login: Redirect auf /login @smoke', async ({ page }) => {
    await page.goto('/super-admin/backshop-aryzta-upload')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Produktgruppen-Seite (Super-Admin) ohne Login: Redirect auf /login @smoke', async ({ page }) => {
    await page.goto('/super-admin/backshop-product-groups')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Marken-Auswahl Mobile-Flow @extended', () => {
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

  test('Schmale Ansicht: Gruppenliste, Tap öffnet Detail, Zurück zur Liste', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/user/marken-auswahl')
    await expect(page).toHaveURL(/\/user\/marken-auswahl/)
    await page.waitForLoadState('networkidle')

    const noGroups = page.getByRole('heading', { name: 'Keine Produktgruppen gefunden' })
    if (await noGroups.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip()
      return
    }

    const list = page.getByTestId('marken-auswahl-gruppen-liste')
    await expect(list).toBeVisible({ timeout: 15_000 })

    const firstGroupRow = list.locator('[data-slot="scroll-area-viewport"] button').first()
    if ((await firstGroupRow.count()) === 0) {
      test.skip()
      return
    }
    await firstGroupRow.click()
    await expect(page.getByTestId('marken-auswahl-detail')).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Zur Übersicht' }).click()
    await expect(list).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('marken-auswahl-detail')).toHaveCount(0)
  })
})
