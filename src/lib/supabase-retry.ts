/**
 * Hilfsfunktionen für Supabase-Anfragen, die bei AbortError automatisch erneut versuchen.
 * AbortErrors entstehen z.B. durch React StrictMode oder schnelle Navigation.
 */

import { isAbortError } from '@/lib/error-utils'

export { isAbortError }

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
