/**
 * Lesbare Fehlermeldung für Toasts / UI (Supabase Postgrest/Storage liefern oft { message } ohne Error-Klasse).
 */
export function toUserErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  const s = typeof error === 'string' ? error.trim() : ''
  if (s) return s
  return 'Unbekannter Fehler'
}
