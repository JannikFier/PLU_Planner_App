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
/** Supabase PostgREST / Auth: oft plain object mit .message, kein Error-Instanz. */
export function formatError(err: unknown, fallback: string = DEFAULT_ERROR_FALLBACK): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err.trim()) return err.trim()
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  return fallback
}

/** PostgREST: Relation fehlt im Schema-Cache (Migration auf Supabase noch nicht angewendet). */
export function isPostgrestMissingRelation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === 'PGRST205') return true
  const msg = String(e.message ?? '')
  return /schema cache/i.test(msg)
}

/** Hinweis, wenn Tabellen für lokale Werbepreise (Migration 051) fehlen. */
export const MISSING_LOCAL_OFFER_PRICES_TABLES_MSG =
  'Die Tabellen für eigene Werbepreise fehlen noch. Bitte Migration 051 (offer_store_local_prices) in Supabase ausführen.'
