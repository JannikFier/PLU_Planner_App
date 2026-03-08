// Zentrale Fehlermeldungen und Helper (DRY)

/** Fallback-Text, wenn keine Fehlermeldung verfügbar ist. */
export const DEFAULT_ERROR_FALLBACK = 'Unbekannter Fehler'

/** Fallback für Excel-Lese-Fehler in der UI (z. B. Toast). */
export const EXCEL_READ_ERROR_FALLBACK = 'Excel konnte nicht gelesen werden.'

/**
 * Wandelt einen unbekannten Fehler (catch) in eine Anzeige-String um.
 * @param err - Fehler aus catch (Error, string oder sonst)
 * @param fallback - Optionaler Fallback, Standard: DEFAULT_ERROR_FALLBACK
 */
export function formatError(err: unknown, fallback: string = DEFAULT_ERROR_FALLBACK): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err.trim()
  return fallback
}
