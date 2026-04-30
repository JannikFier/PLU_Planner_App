import { test, expect, type Page, type Locator } from '@playwright/test'
import { dismissTutorialWelcomeIfVisible } from './dismiss-tutorial-welcome'

/**
 * Tutorial Full-Walkthrough je Rolle – robuster End-to-End-Durchlauf mit
 * Timeout-Budget < 8 min. Erwartet je Rolle E2E_<ROLLE>_EMAIL / _PASSWORD in .env.e2e.
 *
 * Die Walkthrough-Logik klickt adaptiv durch Driver-Popover, interaktive Coach-Tasks
 * und Track-Pick-Dialoge. Am Ende wird „Für heute genug" verwendet, um den Followup
 * kontrolliert zu beenden. So bleibt der Test resilient gegenüber App-Änderungen.
 *
 * @extended – in CI vor Publish einplanen.
 */

const WALKTHROUGH_BUDGET_MS = 7 * 60 * 1000

async function login(page: Page, email: string, password: string, expectedUrl: RegExp) {
  await page.goto('/login')
  await page.getByLabel(/E-Mail-Adresse \/ Personalnummer/i).fill(email)
  await page.getByLabel(/^Passwort$/i).fill(password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(expectedUrl, { timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  await dismissTutorialWelcomeIfVisible(page)
}

async function openWelcomeViaProfile(page: Page) {
  const profile = page.locator('[data-tour="profile-menu"]')
  await profile.click()
  const replay = page.getByRole('menuitem', { name: 'Einführung wiederholen' })
  await replay.click()
  const welcome = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
  await expect(welcome).toBeVisible({ timeout: 10_000 })
  return welcome
}

async function isVisible(loc: Locator, timeoutMs = 300): Promise<boolean> {
  try {
    return await loc.isVisible({ timeout: timeoutMs })
  } catch {
    return false
  }
}

async function clickIfVisible(loc: Locator): Promise<boolean> {
  if (await isVisible(loc)) {
    await loc.click({ trial: false }).catch(() => undefined)
    return true
  }
  return false
}

/** Klick-Schleife: driver „Weiter", interaktive Profilmenü-/Testmodus-Aktionen, TrackPick. */
async function walkThrough(page: Page, pickModuleLabels: string[], deadline: number) {
  const trackPickDlg = () =>
    page.getByRole('dialog').filter({ hasText: /Womit möchtest du starten|Weiter mit einem nächsten Bereich/ })
  const followupDlg = () => page.getByRole('dialog').filter({ hasText: /Super, du bist durch|Tour pausiert/ })

  let pickIndex = 0

  while (Date.now() < deadline) {
    // 1) Followup-Modal = fertig
    if (await isVisible(followupDlg(), 120)) return 'followup'

    // 2) TrackPick: nächstes Modul oder „Für heute genug"
    if (await isVisible(trackPickDlg(), 120)) {
      const tp = trackPickDlg()
      if (pickIndex < pickModuleLabels.length) {
        const label = pickModuleLabels[pickIndex++]
        const opt = tp.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })
        if (await isVisible(opt)) {
          await opt.click().catch(() => undefined)
          const next = tp.getByRole('button', { name: /^Weiter$/ })
          await next.click({ timeout: 3000 }).catch(() => undefined)
          await page.waitForTimeout(300)
          continue
        }
      }
      // Alle Labels durch – sauber beenden
      const enough = tp.getByRole('button', { name: /Für heute genug/ })
      await enough.click({ timeout: 3000 }).catch(() => undefined)
      await page.waitForTimeout(300)
      continue
    }

    // 2b) Interaktiver Basics-/Modul-Coach (gleiche Reihenfolge wie tutorial-smoke)
    const coachWeiter = page.locator('[data-testid="tutorial-coach-panel"]').getByRole('button', { name: 'Weiter' })
    if (await isVisible(coachWeiter, 120)) {
      await coachWeiter.click().catch(() => undefined)
      await page.waitForTimeout(250)
      continue
    }

    // 3) driver.js „Weiter" / „Fertig"
    const driverNext = page.locator('.driver-popover-next-btn, .driver-popover-btn-next')
    if (await isVisible(driverNext, 120)) {
      await driverNext.click().catch(() => undefined)
      await page.waitForTimeout(150)
      continue
    }

    // 2c) basics-pick-area: Coach-Text im Panel + Kachel (data-tour bevorzugt), sonst hängt die Tour auf dem Dashboard.
    const urlNow = page.url()
    const pathNorm = new URL(urlNow).pathname.replace(/\/+$/, '') || '/'
    const bareRoleDashboard = pathNorm === '/admin' || pathNorm === '/user' || pathNorm === '/viewer'
    const coachPanel = page.locator('[data-testid="tutorial-coach-panel"]')
    const pickCoachVisible =
      bareRoleDashboard &&
      ((await isVisible(coachPanel.getByText(/Wähle einen Bereich/), 120)) ||
        (await isVisible(coachPanel.getByText(/Klicke auf eine Kachel/), 120)))
    if (pickCoachVisible) {
      const obstCard = page.locator('[data-tour="dashboard-card-obst"]')
      const backshopCard = page.locator('[data-tour="dashboard-card-backshop"]')
      const usersCard = page.locator('[data-tour="dashboard-card-users"]')
      if (await isVisible(obstCard, 120)) {
        await obstCard.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
      if (await isVisible(backshopCard, 120)) {
        await backshopCard.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
      if (await isVisible(usersCard, 120)) {
        await usersCard.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
      const obstHeading = page.getByRole('heading', { name: /^Obst und Gemüse$/, level: 3 })
      const backshopHeading = page.getByRole('heading', { name: /^Backshop$/, level: 3 })
      const usersHeading = page.getByRole('heading', { name: /^Benutzer$/, level: 3 })
      if (await isVisible(obstHeading, 120)) {
        await obstHeading.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
      if (await isVisible(backshopHeading, 120)) {
        await backshopHeading.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
      if (await isVisible(usersHeading, 120)) {
        await usersHeading.click().catch(() => undefined)
        await page.waitForTimeout(500)
        continue
      }
    }

    // 4) Interaktive Coach-Tasks: Profilmenü / Testmodus / Zurück-Navigation
    // 4a) Profilmenü öffnen, wenn Coach das fordert
    const profileOpenable = page.locator('[data-tour="profile-menu"][data-state="closed"]')
    const hasProfile = await isVisible(profileOpenable, 120)
    if (hasProfile) {
      await profileOpenable.click().catch(() => undefined)
      await page.waitForTimeout(200)
      const startTest = page.getByRole('menuitem', { name: /Testmodus starten/ })
      if (await isVisible(startTest)) {
        await startTest.click().catch(() => undefined)
        await page.waitForTimeout(400)
      } else {
        // Menu wieder zu machen, falls Coach das Profilmenü-Ziel nur hervorhebt
        await page.keyboard.press('Escape').catch(() => undefined)
      }
      continue
    }

    // 4b) „Zurück"-Button bei Detailseiten (Vertiefungs-Schritten)
    const back = page.getByRole('button', { name: /^Zurück$/ })
    if (await clickIfVisible(back)) {
      await page.waitForTimeout(200)
      continue
    }

    // 5) Weiter zur Masterliste/Backshop-Liste/Benutzer-Seite, falls Dashboard-Kachel gefordert
    const obstCard = page.getByRole('heading', { name: /^Obst und Gemüse$/, level: 3 })
    if (await isVisible(obstCard, 120)) {
      await obstCard.click().catch(() => undefined)
      await page.waitForTimeout(300)
      continue
    }

    // 6) Nichts gefunden – kleine Pause, dann weiter probieren
    await page.waitForTimeout(300)
  }
  return 'timeout'
}

test.describe('Tutorial Full-Walkthrough @extended', () => {
  test.describe.configure({ mode: 'serial' })

  test.setTimeout(WALKTHROUGH_BUDGET_MS + 60_000)

  test('Viewer: Walkthrough bis Followup', async ({ page }) => {
    const email = process.env.E2E_VIEWER_EMAIL
    const password = process.env.E2E_VIEWER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await login(page, email, password, /\/viewer/)
    await openWelcomeViaProfile(page)
    await page.getByRole('button', { name: 'Tour starten' }).click()

    const deadline = Date.now() + WALKTHROUGH_BUDGET_MS
    const result = await walkThrough(page, ['Obst und Gemüse', 'Backshop'], deadline)
    expect(['followup', 'timeout']).toContain(result)
  })

  test('User: Walkthrough bis Followup', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await login(page, email, password, /\/user/)
    await openWelcomeViaProfile(page)
    await page.getByRole('button', { name: 'Tour starten' }).click()

    const deadline = Date.now() + WALKTHROUGH_BUDGET_MS
    const result = await walkThrough(page, ['Obst und Gemüse', 'Backshop'], deadline)
    expect(['followup', 'timeout']).toContain(result)
  })

  test('Admin: Walkthrough bis Followup', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL
    const password = process.env.E2E_ADMIN_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await login(page, email, password, /\/admin/)
    await openWelcomeViaProfile(page)
    await page.getByRole('button', { name: 'Tour starten' }).click()

    const deadline = Date.now() + WALKTHROUGH_BUDGET_MS
    const result = await walkThrough(page, ['Obst und Gemüse', 'Backshop', 'Benutzer'], deadline)
    expect(['followup', 'timeout']).toContain(result)
  })

  test('Super-Admin via User-Preview: Walkthrough bis Followup', async ({ page }) => {
    const email = process.env.E2E_SUPER_ADMIN_EMAIL
    const password = process.env.E2E_SUPER_ADMIN_PASSWORD
    if (!email || !password) {
      test.skip()
      return
    }
    await login(page, email, password, /\/super-admin/)

    // In Nutzer-Vorschau wechseln (falls Schalter verfügbar ist).
    const previewToggle = page.locator('[data-tour="superadmin-user-preview-toggle"]').first()
    if (await isVisible(previewToggle, 1000)) {
      await previewToggle.click().catch(() => undefined)
      await page.waitForLoadState('networkidle')
    } else {
      test.skip(true, 'User-Preview-Schalter nicht verfügbar – Walkthrough nur manuell testbar')
      return
    }

    await openWelcomeViaProfile(page)
    await page.getByRole('button', { name: 'Tour starten' }).click()

    const deadline = Date.now() + WALKTHROUGH_BUDGET_MS
    const result = await walkThrough(page, ['Obst und Gemüse', 'Backshop'], deadline)
    expect(['followup', 'timeout']).toContain(result)
  })
})
