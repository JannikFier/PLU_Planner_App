import { expect, test } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * PR 2.6: Smoke-Test fuer die `data-tour`-Anker im Admin/User/Viewer-Bereich
 * (kein Super-Admin) plus den Profil-/Tutorial-Dropdown im AppHeader und das
 * Bug-1-Repro (Profil-Dropdown bleibt klickbar; `modal={false}` verhindert
 * Konflikt mit driver.js).
 *
 * Ziel: Renderpfad jeder Seite + ihre Top-Level-Anker bleibt erreichbar.
 * Datenabhaengige Anker (`user-management-row-first`, Empty-States im Viewer)
 * werden weich geprueft, damit die Tests in unterschiedlichsten Datenstaenden
 * stabil bleiben.
 *
 * @extended — benoetigt `.env.e2e` mit `E2E_ADMIN_*` (wie Admin-Journey).
 */
test.describe('Tutorial PR 2.6 Anchors @extended', () => {
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

  test('Admin-Obst-Hub: Page-Wrapper + Heading attached', async ({ page }) => {
    await page.goto('/admin/obst')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="admin-obst-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(page.locator('[data-tour="admin-obst-hub-heading"]')).toBeAttached()
    await expect(page.locator('[data-tour="admin-obst-hub-liste"]')).toBeAttached()
    await expect(page.locator('[data-tour="admin-obst-hub-konfig"]')).toBeAttached()
  })

  test('Admin-Obst-Konfig-Hub: Wrapper + Karten attached', async ({ page }) => {
    await page.goto('/admin/obst/konfiguration')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="obst-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="obst-konfig-hub-layout-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-hub-rules-card"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="obst-konfig-hub-warengruppen-card"]'),
    ).toBeAttached()
  })

  test('AppHeader Profil-Dropdown: Content + Items erscheinen beim Oeffnen', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)

    const trigger = page.locator('[data-tour="profile-menu"]')
    await expect(trigger).toBeAttached({ timeout: 15_000 })
    await trigger.click()

    await expect(
      page.locator('[data-tour="header-profile-content"]'),
    ).toBeVisible({ timeout: 5_000 })

    // "Admin-Bereich" nur bei reinen Admin-Accounts ohne Super-Admin.
    const adminItem = page.locator('[data-tour="header-admin-area"]')
    if ((await adminItem.count()) > 0) {
      await expect(adminItem).toBeVisible()
    }

    // "Einfuehrung wiederholen" ist fuer alle nicht-Super-Admin sichtbar.
    const replayItem = page.locator('[data-tour="header-replay-intro"]')
    if ((await replayItem.count()) > 0) {
      await expect(replayItem).toBeVisible()
    }

    // Logout muss in jedem Fall vorhanden sein.
    await expect(page.locator('[data-tour="header-logout"]')).toBeVisible()
  })

  test('AppHeader Tutorial-Icon-Dropdown: 3 Items erreichbar', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)

    const tutorialIcon = page.locator('[data-tour="header-tutorial-icon"]')
    if ((await tutorialIcon.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Tutorial-Icon nur sichtbar wenn Orchestrator aktiv (auf diesem Account ggf. nicht).',
      })
      return
    }

    await tutorialIcon.click()
    await expect(
      page.locator('[data-tour="header-tutorial-content"]'),
    ).toBeVisible({ timeout: 5_000 })
    await expect(
      page.locator('[data-tour="header-tutorial-continue"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-tour="header-tutorial-restart"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-tour="header-tutorial-cancel"]'),
    ).toBeVisible()
  })

  test('UserManagement: Wrapper + Liste + Submit-Button attached', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('[data-tour="user-management-page"]')).toBeAttached({
      timeout: 15_000,
    })
    await expect(
      page.locator('[data-tour="user-management-heading"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="user-management-new-user"]'),
    ).toBeAttached()
    await expect(
      page.locator('[data-tour="user-management-list"]'),
    ).toBeAttached()

    // Erste Zeile + Aktionen nur bei Daten; weich pruefen.
    const firstRow = page.locator('[data-tour="user-management-row-first"]')
    if ((await firstRow.count()) > 0) {
      await expect(firstRow).toBeAttached()
      // Edit-Combo + Reset-PW nur dann, wenn die erste Zeile bearbeitbar ist.
      const editCombo = page.locator('[data-tour="user-management-row-edit"]')
      if ((await editCombo.count()) > 0) {
        await expect(editCombo).toBeAttached()
      }
      const resetBtn = page.locator(
        '[data-tour="user-management-row-reset-pw"]',
      )
      if ((await resetBtn.count()) > 0) {
        await expect(resetBtn).toBeAttached()
      }
    }

    // Anlegen-Dialog + Submit-Button via Trigger oeffnen.
    const newUserBtn = page.locator('[data-tour="user-management-new-user"]')
    await newUserBtn.click()
    await expect(
      page.locator('[data-tour="user-management-create-dialog"]'),
    ).toBeAttached({ timeout: 5_000 })
    await expect(
      page.locator('[data-tour="user-management-create-submit"]'),
    ).toBeAttached()
  })

  test('Bug 1 Repro: Profil-Dropdown bleibt nach Schliessen + Wiederoeffnen klickbar', async ({
    page,
  }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await dismissTutorialWelcomeIfVisible(page)

    const trigger = page.locator('[data-tour="profile-menu"]')
    await expect(trigger).toBeAttached({ timeout: 15_000 })

    // 1. Oeffnen
    await trigger.click()
    await expect(
      page.locator('[data-tour="header-profile-content"]'),
    ).toBeVisible({ timeout: 5_000 })

    // 2. Schliessen via Escape
    await page.keyboard.press('Escape')
    await expect(
      page.locator('[data-tour="header-profile-content"]'),
    ).toBeHidden({ timeout: 3_000 })

    // 3. Erneut oeffnen — darf nicht "haengen".
    await trigger.click()
    await expect(
      page.locator('[data-tour="header-profile-content"]'),
    ).toBeVisible({ timeout: 5_000 })

    // 4. Logout-Item ist klickbar (= kein Fokus-/pointer-events-Konflikt).
    await expect(page.locator('[data-tour="header-logout"]')).toBeVisible()
  })

  test('Mobile-Variante: Admin-Obst-Hub + Konfig-Hub + UserMgmt erreichbar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/admin/obst')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="admin-obst-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })

    await page.goto('/admin/obst/konfiguration')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="obst-konfig-hub-page"]')).toBeAttached({
      timeout: 15_000,
    })

    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-tour="user-management-page"]')).toBeAttached({
      timeout: 15_000,
    })
  })
})
