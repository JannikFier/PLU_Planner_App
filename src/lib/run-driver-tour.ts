import { driver, type Config, type DriveStep, type Driver, type DriverHook } from 'driver.js'

export type DriverTourResult = 'finished' | 'closed'

/** Erster Schritt einer Mehrtagestour: kein nutzloses „Zurück“ (driver.js zeigt es sonst deaktiviert). */
function withFirstStepWithoutPreviousButton(steps: DriveStep[]): DriveStep[] {
  if (steps.length < 2) return steps
  const first = steps[0]
  if (!first?.popover) return steps
  const sb = first.popover.showButtons
  if (Array.isArray(sb) && !sb.includes('previous')) return steps
  return [
    {
      ...first,
      popover: {
        ...first.popover,
        showButtons: ['next', 'close'],
      },
    },
    ...steps.slice(1),
  ]
}

/** gesetzter Driver während einer laufenden Tour (für harten Abbruch z. B. Testmodus aus) */
let activeDriverInstance: Driver | null = null
let destroyReasonForced = false

export function destroyActiveDriverTour(): void {
  try {
    if (activeDriverInstance) {
      destroyReasonForced = true
      activeDriverInstance.destroy()
    }
  } catch {
    /* bereits zerstört */
  }
  activeDriverInstance = null
}

/**
 * Liefert den aktuellen 0-basierten Step-Index der aktiven Driver-Tour,
 * oder `null`, wenn keine Tour läuft.
 */
export function getActiveDriverStepIndex(): number | null {
  try {
    if (!activeDriverInstance) return null
    const api = activeDriverInstance as unknown as { getActiveIndex?: () => number }
    if (typeof api.getActiveIndex === 'function') return api.getActiveIndex() ?? null
  } catch {
    return null
  }
  return null
}

/**
 * Startet eine driver.js-Tour und resolved, wenn die Tour beendet wurde (letzter Schritt oder Schließen).
 */
export function runDriverTour(steps: DriveStep[], config?: Partial<Config>): Promise<DriverTourResult> {
  return new Promise((resolve) => {
    const prepared = withFirstStepWithoutPreviousButton(steps)
    let explicitClose = false
    const onCloseClick: DriverHook = (_el, _step, { driver }) => {
      explicitClose = true
      driver.destroy()
    }
    const single = prepared.length === 1
    /** Einzelschritt: kein nutzloses „Zurück“, kein „1 von 1“-Fortschritt. */
    const singleStepDefaults: Partial<Config> = single
      ? { showButtons: ['next', 'close'], showProgress: false }
      : {}
    const d: Driver = driver({
      showProgress: true,
      nextBtnText: 'Weiter',
      prevBtnText: 'Zurück',
      doneBtnText: 'Fertig',
      progressText: '{{current}} von {{total}}',
      allowClose: true,
      overlayOpacity: 0.55,
      ...singleStepDefaults,
      ...config,
      steps: prepared,
      onCloseClick,
      onDestroyed: () => {
        if (activeDriverInstance === d) activeDriverInstance = null
        const forced = destroyReasonForced
        destroyReasonForced = false
        resolve(forced || explicitClose ? 'closed' : 'finished')
      },
    })
    activeDriverInstance = d
    d.drive()
  })
}
