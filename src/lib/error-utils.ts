/** Prüft, ob ein Fehler ein AbortError ist (Browser oder Supabase). Inkl. cause-Kette. */
export function isAbortError(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')) {
    return true
  }
  const o = err as { message?: string; cause?: unknown }
  return (
    !!o?.message?.includes?.('AbortError') ||
    (o?.cause != null && isAbortError(o.cause))
  )
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
