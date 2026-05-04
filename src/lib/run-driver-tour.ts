// Phase 1 des Tutorial-Rewrites (siehe Plan-Datei): Diese Datei delegiert komplett an
// run-driver-tour-v2. Alter Implementierungs-Pfad ist damit deaktiviert; v2 nutzt
// einen echten Mutex (verhindert Backdrop-Stacking + Doppel-Steps bei schnellen
// Routenwechseln / StrictMode).
//
// Externe Importe von runDriverTour, destroyActiveDriverTour, getActiveDriverStepIndex
// funktionieren weiter unverändert — die Public API ist API-kompatibel.
//
// Phase 4 (Cleanup): Diese Datei kann gelöscht werden, sobald alle Importe direkt auf
// run-driver-tour-v2 zeigen.

export {
  runDriverTour,
  destroyActiveDriverTour,
  getActiveDriverStepIndex,
  createDriverTourLifecycle,
  type DriverTourResult,
} from '@/lib/run-driver-tour-v2'
