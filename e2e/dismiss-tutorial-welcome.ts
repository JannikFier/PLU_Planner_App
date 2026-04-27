import type { Page } from '@playwright/test'

/**
 * Schließt den automatischen Tutorial-Willkommensdialog, falls er offen ist.
 * Der Dialog mountet oft erst nach `networkidle` – daher kurz pollen.
 * Offenes Radix-Overlay blendet die Seite in der Accessibility aus und blockiert Klicks.
 */
export async function dismissTutorialWelcomeIfVisible(page: Page): Promise<void> {
  const welcome = page.getByRole('dialog').filter({ hasText: 'Hi, ich bin Fier' })
  const skip = welcome.getByRole('button', { name: 'Überspringen' })
  const overlay = page.locator('[data-slot="dialog-overlay"][data-state="open"]')

  for (let attempt = 0; attempt < 55; attempt++) {
    if (await skip.isVisible().catch(() => false)) {
      await skip.click({ timeout: 8000 })
      await welcome.waitFor({ state: 'hidden', timeout: 12_000 }).catch(() => {})
      return
    }
    // Sichtbares Overlay, aber Skip noch nicht da: ESC schließt u. a. den Welcome-Dialog
    if (attempt > 2 && (await overlay.count()) > 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(120)
  }
}
