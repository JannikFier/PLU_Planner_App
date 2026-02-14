/**
 * Hilfsfunktionen für Supabase-Anfragen, die bei AbortError automatisch erneut versuchen.
 * AbortErrors entstehen z.B. durch React StrictMode oder schnelle Navigation.
 */

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

/**
 * Führt eine asynchrone Funktion aus und wiederholt sie bei AbortError (max. 1x mit Verzögerung).
 */
export async function withRetryOnAbort<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const isLast = attempt === maxRetries
      if (isAbortError(e) && !isLast) {
        await new Promise((r) => setTimeout(r, 80 + attempt * 80))
        continue
      }
      throw e
    }
  }
  throw new Error('Unreachable')
}
