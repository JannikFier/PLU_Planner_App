import { test, expect } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * Tutorial: Smoke-Tests für die wichtigsten UX-Flows – Dismiss / Skip / ESC /
 * Basics-dann-TrackPick. Volle Walkthroughs liegen in tutorial-full-walkthrough.spec.ts.
 * @extended — benötigt .env.e2e mit E2E_ADMIN_* (wie Admin-Journey).
 * Wichtig: E2E_ADMIN_* muss ein echter Admin (role admin, /admin/) sein – kein Super-Admin-Konto.
 */
test.describe('Tutorial Smoke @extended', () => {
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
    await expect(page.getByRole('heading', { name: 'Administration', level: 2 })).toBeVisible({ timeout: 15_000 })
  })

  test('Dashboard enthält Tutorial-Anker data-tour dashboard-welcome', async ({ page }) => {
    await expect(page.locator('[data-tour="dashboard-welcome"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Profilmenü enthält Einführung wiederholen', async ({ page }) => {
    await page.locator('[data-tour="profile-menu"]').click()
    await expect(page.getByRole('menuitem', { name: 'Einführung wiederholen' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('Header: Rundgang-Icon sichtbar', async ({ page }) => {
    await expect(page.locator('[data-tour="header-tutorial-icon"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Welcome-Modal hat drei Buttons – Tour starten / Überspringen / Nicht mehr anzeigen', async ({ page }) => {
    // Zurücksetzen und Welcome erzwingen
    await page.locator('[data-tour="profile-menu"]').click()
    await page.getByRole('menuitem', { name: 'Einführung wiederholen' }).click()
    const dlg = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await expect(dlg.getByRole('button', { name: 'Tour starten' })).toBeVisible()
    await expect(dlg.getByRole('button', { name: 'Überspringen' })).toBeVisible()
    await expect(dlg.getByRole('button', { name: 'Nicht mehr anzeigen' })).toBeVisible()
  })

  test('Welcome ESC schließt ohne Followup', async ({ page }) => {
    await page.locator('[data-tour="profile-menu"]').click()
    await page.getByRole('menuitem', { name: 'Einführung wiederholen' }).click()
    const dlg = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')
    await expect(dlg).toBeHidden({ timeout: 5_000 })
    // Kein Followup-Modal
    await expect(page.getByText('Super, du bist durch!')).not.toBeVisible()
    await expect(page.getByText('Tour pausiert')).not.toBeVisible()
  })

  test('Nicht mehr anzeigen verhindert Welcome nach Reload', async ({ page }) => {
    await page.locator('[data-tour="profile-menu"]').click()
    await page.getByRole('menuitem', { name: 'Einführung wiederholen' }).click()
    const dlg = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
    await expect(dlg).toBeVisible({ timeout: 10_000 })
    await dlg.getByRole('button', { name: 'Nicht mehr anzeigen' }).click()
    await expect(dlg).toBeHidden({ timeout: 5_000 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })).not.toBeVisible()
  })

  test('Tour starten: nach Basics TrackPick oder bereichsinferierter Modulstart', async ({ page }) => {
    test.setTimeout(60_000)
    await page.locator('[data-tour="profile-menu"]').click()
    await page.getByRole('menuitem', { name: 'Einführung wiederholen' }).click()
    const welcome = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
    await expect(welcome).toBeVisible({ timeout: 10_000 })
    await welcome.getByRole('button', { name: 'Tour starten' }).click()
    await expect(welcome).toBeHidden({ timeout: 15_000 })

    // Basics: Admin/Non-Viewer = interaktiver Coach (TutorialCoachPanel, „Weiter“); sonst driver.js.
    // Max. Iterationen hoch – Basics inkl. Header-Hints + Pick-Area sind viele Schritte.
    // Nach „Bereich wählen“ kann die App den Track-Pick überspringen und das Modul aus der URL ableiten
    // (inferTutorialModuleFromPath) – dann erscheint kein „Womit möchtest du starten?“-Dialog.
    const masterlistPageTitle = page.getByRole('heading', { name: /PLU Obst und Gemüse/i, level: 2 })
    const backshopListTitle = page.getByRole('heading', { name: /PLU-Liste Backshop|PLU Backshop/i })
    for (let i = 0; i < 45; i += 1) {
      const trackPick = page.getByRole('dialog').filter({
        hasText: /Womit möchtest du starten|Weiter mit einem nächsten Bereich/,
      })
      if (await trackPick.isVisible().catch(() => false)) break
      const inferredContent =
        (await page.locator('[data-tour="masterlist-toolbar-actions"]').isVisible().catch(() => false)) ||
        (await page.locator('[data-tour="obst-master-toolbar"]').isVisible().catch(() => false)) ||
        (await masterlistPageTitle.isVisible().catch(() => false)) ||
        (await page.locator('[data-tour="backshop-master-toolbar"]').isVisible().catch(() => false)) ||
        (await backshopListTitle.isVisible().catch(() => false)) ||
        (await page.locator('[data-tour="user-management-heading"]').isVisible().catch(() => false))
      if (inferredContent) break
      const coachWeiter = page.locator('[data-testid="tutorial-coach-panel"]').getByRole('button', { name: 'Weiter' })
      if (await coachWeiter.isVisible().catch(() => false)) {
        await coachWeiter.click()
        await page.waitForTimeout(250)
        continue
      }
      const next = page.locator('.driver-popover-next-btn, .driver-popover-btn-next')
      if (await next.isVisible().catch(() => false)) {
        await next.click()
        await page.waitForTimeout(200)
        continue
      }
      // basics-pick-area: Coach fordert Kachel-Klick; oft kein „Weiter“ (nur Validierung per Navigation).
      const urlNow = page.url()
      const pathNorm = new URL(urlNow).pathname.replace(/\/+$/, '') || '/'
      const bareAdminDashboard = pathNorm === '/admin'
      const coachPanel = page.locator('[data-testid="tutorial-coach-panel"]')
      const pickCoachVisible =
        bareAdminDashboard &&
        ((await coachPanel.getByText(/Wähle einen Bereich/).isVisible().catch(() => false)) ||
          (await coachPanel.getByText(/Klicke auf eine Kachel/).isVisible().catch(() => false)))
      if (pickCoachVisible) {
        const obstCard = page.locator('[data-tour="dashboard-card-obst"]')
        const backshopCard = page.locator('[data-tour="dashboard-card-backshop"]')
        const usersCard = page.locator('[data-tour="dashboard-card-users"]')
        if (await obstCard.isVisible().catch(() => false)) {
          await obstCard.click()
          await page.waitForTimeout(500)
          continue
        }
        if (await backshopCard.isVisible().catch(() => false)) {
          await backshopCard.click()
          await page.waitForTimeout(500)
          continue
        }
        if (await usersCard.isVisible().catch(() => false)) {
          await usersCard.click()
          await page.waitForTimeout(500)
          continue
        }
        const obstHeading = page.getByRole('heading', { name: /^Obst und Gemüse$/, level: 3 })
        const backshopHeading = page.getByRole('heading', { name: /^Backshop$/, level: 3 })
        const usersHeading = page.getByRole('heading', { name: /^Benutzer$/, level: 3 })
        if (await obstHeading.isVisible().catch(() => false)) {
          await obstHeading.click()
          await page.waitForTimeout(500)
          continue
        }
        if (await backshopHeading.isVisible().catch(() => false)) {
          await backshopHeading.click()
          await page.waitForTimeout(500)
          continue
        }
        if (await usersHeading.isVisible().catch(() => false)) {
          await usersHeading.click()
          await page.waitForTimeout(500)
          continue
        }
      }
      // Interaktiver Task: Profilmenü öffnen / Testmodus starten
      const profile = page.locator('[data-tour="profile-menu"]')
      if (await profile.isVisible().catch(() => false)) {
        await profile.click()
        const testmodeItem = page.getByRole('menuitem', { name: /Testmodus starten/ })
        if (await testmodeItem.isVisible().catch(() => false)) {
          await testmodeItem.click()
        }
        await page.waitForTimeout(300)
      } else {
        break
      }
    }

    const trackPickOrInferredStart = page
      .getByRole('dialog')
      .filter({ hasText: /Womit möchtest du starten|Weiter mit einem nächsten Bereich/ })
      .or(page.locator('[data-tour="masterlist-toolbar-actions"]'))
      .or(page.locator('[data-tour="obst-master-toolbar"]'))
      .or(masterlistPageTitle)
      .or(page.locator('[data-tour="backshop-master-toolbar"]'))
      .or(backshopListTitle)
      .or(page.locator('[data-tour="user-management-heading"]'))
    await expect(trackPickOrInferredStart.first()).toBeVisible({ timeout: 45_000 })
  })
})
