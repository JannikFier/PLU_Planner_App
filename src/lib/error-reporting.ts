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

/** true sobald Sentry (oder spaeter anderer Dienst) aktiv initialisiert ist */
let _sentryInitialized = false

let _consoleModeHintLogged = false

export function initErrorReporting(): void {
  if (SENTRY_DSN) {
    if (_sentryInitialized) return
    _sentryInitialized = true
    // Wenn Sentry eingerichtet wird:
    // import * as Sentry from '@sentry/react'
    // Sentry.init({ dsn: SENTRY_DSN, environment: import.meta.env.MODE })
    console.info('[Error Reporting] Bereit (Sentry-DSN gesetzt; Capture folgt bei Integration)')
    return
  }
  if (!_consoleModeHintLogged) {
    _consoleModeHintLogged = true
    console.info('[Error Reporting] Nur Konsole (kein VITE_SENTRY_DSN).')
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (_sentryInitialized) {
    // Wenn Sentry eingerichtet wird:
    // Sentry.captureException(error, { extra: context })
    console.error('[Error Reporting]', error, context)
    return
  }
  console.error('[App]', error, context)
}
