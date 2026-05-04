/** Einheitliche Nutzer-Meldung bei abgebrochener Anmeldung (Fetch/Auth-Abort). */
export const LOGIN_ABORT_USER_MESSAGE =
  'Die Anmeldung wurde unterbrochen. Bitte versuche es erneut.'

/** Prüft, ob ein Fehler ein AbortError ist (Browser oder Supabase). Inkl. cause-Kette. */
export function isAbortError(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
    return true
  }
  if (err != null && typeof err === 'object') {
    const o = err as { name?: string; code?: string; message?: string; cause?: unknown }
    if (o.name === 'AbortError' || o.code === 'ABORT_ERR') return true
    const msg = (o.message ?? '').toLowerCase()
    if (msg.includes('signal is aborted')) return true
    if (msg.includes('aborterror')) return true
    if (o.cause != null && isAbortError(o.cause)) return true
  }
  return false
}

function messageString(reason: unknown): string {
  if (reason instanceof Error) return reason.message ?? ''
  if (reason != null && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message: unknown }).message ?? '')
  }
  return String(reason ?? '')
}

/**
 * true = an globales Reporting (z. B. unhandledrejection) weitergeben.
 * false = harmloser Abbruch (Abort) – nicht melden, Browser-Warnung unterdrücken.
 */
export function shouldReportGlobalError(reason: unknown): boolean {
  if (isAbortError(reason)) return false
  const m = messageString(reason).toLowerCase()
  if (m.includes('signal is aborted')) return false
  if (m.includes('aborterror')) return false
  return true
}
