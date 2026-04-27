/**
 * PostgREST 42P10: ON CONFLICT bezieht sich auf einen Unique, den die DB noch nicht hat
 * (z. B. Migration 066 nicht angewendet → nur UNIQUE(user_id, version_id)).
 */
export function isLegacyOnConflictConstraintError(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  if (e.code === '42P10') return true
  const m = e.message ?? ''
  return m.includes('no unique or exclusion constraint matching the ON CONFLICT')
}

/** Ein Key für Obst- und Backshop-MarkRead: gleiche Migration 066 auf der DB. */
const LS_VN_UPSERT_MODE = 'planner_vn_upsert_mode'

export type VersionNotificationsUpsertMode = 'triple' | 'legacy'

/**
 * Standard: legacy (nur user_id+version_id) – vermeidet 400, solange Migration 066 auf der DB fehlt.
 * Explizit "triple" nur nach Setzen (z. B. erkanntes Schema mit UNIQUE inkl. store_id).
 */
export function getVersionNotificationsUpsertMode(): VersionNotificationsUpsertMode {
  if (typeof localStorage === 'undefined') return 'legacy'
  return localStorage.getItem(LS_VN_UPSERT_MODE) === 'triple' ? 'triple' : 'legacy'
}

export function setVersionNotificationsUpsertMode(mode: VersionNotificationsUpsertMode): void {
  try {
    localStorage.setItem(LS_VN_UPSERT_MODE, mode)
  } catch {
    /* z. B. private mode */
  }
}
