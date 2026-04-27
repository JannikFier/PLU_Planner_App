/**
 * „Diese Sitzung überspringen" – bleibt nur bis Tab-/Browser-Close erhalten.
 * Wird NICHT in der DB persistiert (im Gegensatz zu `dismissedForever`).
 *
 * Scope absichtlich pro User+Markt, damit ein Markt-Wechsel in derselben
 * Session das Tutorial wieder anbietet.
 */

const STORAGE_KEY_PREFIX = 'plu.tutorial.skipped-this-session'

function storageKey(userId: string | null | undefined, storeId: string | null | undefined): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? '-'}:${storeId ?? '-'}`
}

function readSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function isTutorialSkippedThisSession(
  userId: string | null | undefined,
  storeId: string | null | undefined,
): boolean {
  const ss = readSessionStorage()
  if (!ss) return false
  try {
    return ss.getItem(storageKey(userId, storeId)) === '1'
  } catch {
    return false
  }
}

export function markTutorialSkippedThisSession(
  userId: string | null | undefined,
  storeId: string | null | undefined,
): void {
  const ss = readSessionStorage()
  if (!ss) return
  try {
    ss.setItem(storageKey(userId, storeId), '1')
  } catch {
    /* ignore */
  }
}

export function clearTutorialSkippedThisSession(
  userId: string | null | undefined,
  storeId: string | null | undefined,
): void {
  const ss = readSessionStorage()
  if (!ss) return
  try {
    ss.removeItem(storageKey(userId, storeId))
  } catch {
    /* ignore */
  }
}
