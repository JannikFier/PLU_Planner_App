/**
 * Einheitliche Rollen-Präfixe für Navigation und RedirectRolePrefixed.
 * Bei Super-Admin-Vorschau gilt simulatedRole statt profile.role.
 */

import type { UserPreviewSessionState } from '@/lib/user-preview-session'

export type DashboardPath = '/super-admin' | '/admin' | '/user' | '/viewer' | '/kiosk'

/** Basis-Dashboard je DB-Rolle bzw. simulierter Rolle. */
export function roleToDashboardPath(role: string | undefined): DashboardPath {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'admin':
      return '/admin'
    case 'viewer':
      return '/viewer'
    case 'kiosk':
      return '/kiosk'
    default:
      return '/user'
  }
}

/**
 * Effektive Rolle für Routing: bei aktiver User-Vorschau die simulierte Rolle,
 * sonst die Profil-Rolle.
 */
export function getEffectiveRouteRole(
  profileRole: string | undefined,
  preview: Pick<UserPreviewSessionState, 'active' | 'simulatedRole'> | null,
): string {
  if (preview?.active) return preview.simulatedRole
  return profileRole ?? 'user'
}

/** Startseite nach Login / HomeRedirect / Header-Logo (Vorschau berücksichtigt). */
export function getHomeDashboardPath(
  profileRole: string | undefined,
  preview: Pick<UserPreviewSessionState, 'active' | 'simulatedRole'> | null,
): DashboardPath {
  return roleToDashboardPath(getEffectiveRouteRole(profileRole, preview))
}

/** Basis für /segment → `${prefix}/${segment}` (RedirectRolePrefixed). */
export function getRolePrefixedBasePath(
  profileRole: string | undefined,
  preview: Pick<UserPreviewSessionState, 'active' | 'simulatedRole'> | null,
): DashboardPath {
  return roleToDashboardPath(getEffectiveRouteRole(profileRole, preview))
}
