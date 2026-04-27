/**
 * Prüft, ob ein backTo-Ziel im Admin-Bereich sicher ist (kein Open-Redirect).
 */
export function isSafeAdminBackToTarget(target: string): boolean {
  const t = target.trim()
  if (!t.startsWith('/admin/')) return false
  if (t.includes('//')) return false
  if (/[\s\r\n]/.test(t)) return false
  const lower = t.toLowerCase()
  if (lower.includes('javascript:') || lower.includes('data:')) return false
  return true
}

/**
 * Prüft, ob ein backTo-Ziel im Super-Admin-Bereich sicher ist (kein Open-Redirect).
 */
export function isSafeSuperAdminBackToTarget(target: string): boolean {
  const t = target.trim()
  if (!t.startsWith('/super-admin/')) return false
  if (t.includes('//')) return false
  if (t.includes('..')) return false
  if (/[\s\r\n]/.test(t)) return false
  const lower = t.toLowerCase()
  if (lower.includes('javascript:') || lower.includes('data:')) return false
  return true
}

/** Seiten, die optional per state/query backTo überschreiben (Ziel muss isSafeAdminBackToTarget bestehen). */
export const ADMIN_PATHS_WITH_OPTIONAL_BACK_TO = [
  '/admin/layout',
  '/admin/rules',
  '/admin/block-sort',
  '/admin/obst-warengruppen',
] as const
