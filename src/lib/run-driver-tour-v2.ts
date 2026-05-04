// Verbesserter Driver.js-Wrapper für Tutorial-Touren (Phase 0 des Tutorial-Rewrites).
//
// Unterschiede zu run-driver-tour.ts (v1):
//   1. Echter Mutex: bei laufender Tour wird zuerst die alte zerstört, bevor eine neue startet
//      (verhindert Backdrop-Stacking und Doppel-Steps bei schnellen Routenwechseln / StrictMode).
//   2. Lifecycle-Helper `createDriverTourLifecycle()` für useEffect-basiertes Mount/Unmount-Cleanup.
//   3. Async/await-API statt `new Promise(...)`-Wrapping.
//
// Public Funktion `runDriverTour()` ist mit v1-Signatur identisch — graduelles Umstellen möglich.
// Diese Datei verändert NICHT die existierende run-driver-tour.ts; beide Module können parallel
// existieren bis das v2-Curriculum geschrieben ist (Phase 2).

import { driver, type Config, type DriveStep, type Driver, type DriverHook } from 'driver.js'

export type DriverTourResult = 'finished' | 'closed'

// Modul-globaler Mutex über alle Aufrufer (egal von welcher Komponente).
let activeDriverInstance: Driver | null = null
let activeDestroyPromise: Promise<void> | null = null
let destroyReasonForced = false

/** Erster Schritt einer Mehrtagestour: kein nutzloses „Zurück" (v1-Kompat). */
function withFirstStepWithoutPreviousButton(steps: DriveStep[]): DriveStep[] {
  if (steps.length < 2) return steps
  const first = steps[0]
  if (!first?.popover) return steps
  const sb = first.popover.showButtons
  if (Array.isArray(sb) && !sb.includes('previous')) return steps
  return [
    {
      ...first,
      popover: { ...first.popover, showButtons: ['next', 'close'] },
    },
    ...steps.slice(1),
  ]
}

/** Zerstört die aktuell laufende Tour (synchron). v1-API-kompatibel. */
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

/** Aktueller 0-basierter Step-Index, oder null wenn keine Tour läuft. v1-API-kompatibel. */
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
 * Wartet bis die letzte destroy()-Operation abgeschlossen ist (onDestroyed-Hook).
 * Driver.js' destroy() ist synchron, onDestroyed läuft aber asynchron im nächsten Tick.
 */
async function waitForActiveDestroy(): Promise<void> {
  if (activeDestroyPromise) {
    try {
      await activeDestroyPromise
    } catch {
      /* destroy darf scheitern, wir wollen nur sicher gehen dass es vorbei ist */
    }
  }
}

/**
 * Startet eine Driver.js-Tour. Falls schon eine läuft: wird zuerst zerstört (Mutex).
 * Resolved mit `'finished'` nach dem letzten Step oder `'closed'` bei explizitem Schließen.
 */
export async function runDriverTour(
  steps: DriveStep[],
  config?: Partial<Config>,
): Promise<DriverTourResult> {
  // Mutex: laufende Tour zuerst zerstören und auf vollständige Cleanup-Zusage warten.
  if (activeDriverInstance) {
    destroyActiveDriverTour()
    await waitForActiveDestroy()
  }

  return new Promise<DriverTourResult>((resolve) => {
    const prepared = withFirstStepWithoutPreviousButton(steps)
    let explicitClose = false
    let destroyResolver: (() => void) | null = null
    activeDestroyPromise = new Promise<void>((res) => {
      destroyResolver = res
    })

    const onCloseClick: DriverHook = (_el, _step, { driver: drv }) => {
      explicitClose = true
      drv.destroy()
    }
    const single = prepared.length === 1
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
        if (activeDriverInstance === d) {
          activeDriverInstance = null
          activeDestroyPromise = null
        }
        const forced = destroyReasonForced
        destroyReasonForced = false
        destroyResolver?.()
        resolve(forced || explicitClose ? 'closed' : 'finished')
      },
    })
    activeDriverInstance = d
    d.drive()
  })
}

/**
 * Lifecycle-Helper für React useEffect.
 *
 * Verwendung:
 *   useEffect(() => {
 *     const lc = createDriverTourLifecycle()
 *     void lc.run(steps)
 *     return () => lc.dispose()
 *   }, [...])
 *
 * Garantiert dass beim Unmount oder Re-Run die Tour zerstört wird.
 * Calls zu `run()` nach `dispose()` werden ignoriert (no-op, resolved 'closed').
 */
export function createDriverTourLifecycle() {
  let alive = true

  return {
    run(steps: DriveStep[], config?: Partial<Config>): Promise<DriverTourResult> {
      if (!alive) return Promise.resolve<DriverTourResult>('closed')
      return runDriverTour(steps, config)
    },
    dispose(): void {
      alive = false
      destroyActiveDriverTour()
    },
    isAlive(): boolean {
      return alive
    },
  }
}
