import { test, expect } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * Tutorial: Smoke-Tests für die wichtigsten UX-Flows – Dismiss / Skip / ESC /
 * Basics-dann-TrackPick. Volle Walkthroughs liegen in tutorial-full-walkthrough.spec.ts.
 * @extended — benötigt .env.e2e mit E2E_ADMIN_* (wie Admin-Journey).
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

  test('Tour starten führt in Basics und anschließenden TrackPick', async ({ page }) => {
    test.setTimeout(60_000)
    await page.locator('[data-tour="profile-menu"]').click()
    await page.getByRole('menuitem', { name: 'Einführung wiederholen' }).click()
    const welcome = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
    await expect(welcome).toBeVisible({ timeout: 10_000 })
    await welcome.getByRole('button', { name: 'Tour starten' }).click()
    await expect(welcome).toBeHidden({ timeout: 15_000 })

    // Basics: Admin/Non-Viewer = interaktiver Coach (TutorialCoachPanel, „Weiter“); sonst driver.js.
    // Max. Iterationen hoch – Basics inkl. Header-Hints + Pick-Area sind viele Schritte.
    for (let i = 0; i < 45; i += 1) {
      const trackPick = page.getByRole('dialog').filter({
        hasText: /Womit möchtest du starten|Weiter mit einem nächsten Bereich/,
      })
      if (await trackPick.isVisible().catch(() => false)) break
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

    // Zwischen-/Start-Trackpick sollte irgendwann erscheinen (nach vielen Coach-Acks)
    await expect(
      page.getByRole('dialog').filter({ hasText: /Womit möchtest du starten|Weiter mit einem nächsten Bereich/ }),
    ).toBeVisible({ timeout: 30_000 })
  })
})
