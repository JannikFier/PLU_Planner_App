/**
 * Zentrales Error-Reporting – Adapter fuer einen externen Service (z.B. Sentry).
 *
 * Aktuell: Loggt Fehler nur in die Konsole.
 * Spaeter: Sentry.init() und Sentry.captureException() einbinden.
 *
 * Setup fuer Sentry:
 * 1. npm install @sentry/react
 * 2. VITE_SENTRY_DSN in .env.local setzen
 * 3. initErrorReporting() in main.tsx VOR createRoot aufrufen
 * 4. captureError() wird von ErrorBoundary und globalen Handlern genutzt
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

let _initialized = false

export function initErrorReporting(): void {
  if (_initialized || !SENTRY_DSN) return
  _initialized = true

  // Wenn Sentry eingerichtet wird:
  // import * as Sentry from '@sentry/react'
  // Sentry.init({ dsn: SENTRY_DSN, environment: import.meta.env.MODE })
  console.info('[Error Reporting] Bereit (kein externer Service konfiguriert)')
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!_initialized) {
    console.error('[Error Reporting – nicht initialisiert]', error, context)
    return
  }

  // Wenn Sentry eingerichtet wird:
  // Sentry.captureException(error, { extra: context })
  console.error('[Error Reporting]', error, context)
}
