/**
 * Kanonische Hosts nach Login: Super-Admin unter www, Marktrollen unter Markt-Subdomain.
 * Nur fuer echte Deploy-Domain (nicht localhost).
 */

import type { DashboardPath } from '@/lib/effective-route-prefix'
import { getHomeDashboardPath } from '@/lib/effective-route-prefix'
import type { UserPreviewSessionState } from '@/lib/user-preview-session'
import { buildStoreUrl, normalizeViteAppDomain } from '@/lib/subdomain'

export interface CanonicalHostRedirectInput {
  appDomain: string
  hostname: string
  profileRole: string | undefined
  storeSubdomain: string | null
  /** true solange StoreContext den Markt noch aufloest */
  storeLoading: boolean
  isAdminDomain: boolean
  preview: Pick<UserPreviewSessionState, 'active' | 'simulatedRole'> | null
  /** location.state.from.pathname */
  fromPathname: string | undefined
}

/**
 * Wenn nicht null: voller Seitenwechsel per window.location.assign(url).
 * localhost -> immer null (SPA-Navigate bleibt).
 */
export function getPostLoginCanonicalRedirectUrl(input: CanonicalHostRedirectInput): string | null {
  const appDomain = normalizeViteAppDomain(input.appDomain)
  if (appDomain === 'localhost') return null

  const role = input.profileRole
  if (!role || role === 'kiosk') return null

  const homePath = getHomeDashboardPath(role, input.preview)
  const path = pickSafePostLoginPath(role, input.fromPathname, homePath)

  if (role === 'super_admin') {
    const wantHost = `www.${appDomain}`
    if (input.hostname.toLowerCase() === wantHost.toLowerCase()) return null
    return `https://${wantHost}${path}`
  }

  if (input.isAdminDomain) return null

  if (input.storeLoading || !input.storeSubdomain) return null

  const marketOrigin = buildStoreUrl(input.storeSubdomain, appDomain)
  try {
    const target = new URL(marketOrigin)
    if (input.hostname.toLowerCase() === target.hostname.toLowerCase()) return null
  } catch {
    return null
  }

  return `${marketOrigin}${path.startsWith('/') ? path : `/${path}`}`
}

export function pickSafePostLoginPath(
  role: string,
  from: string | undefined,
  homePath: DashboardPath,
): string {
  if (!from || !from.startsWith('/')) return homePath
  if (role === 'super_admin' && from.startsWith('/super-admin')) return from
  if ((role === 'admin' || role === 'super_admin') && from.startsWith('/admin')) return from
  if (role === 'viewer' && from.startsWith('/viewer')) return from
  if (role === 'user' && from.startsWith('/user')) return from
  return homePath
}

/** Nach Marktwechsel: Ziel-URL auf anderem Host (null = kein Wechsel noetig). */
export function getStoreSwitchHostRedirectUrl(input: {
  appDomain: string
  newStoreSubdomain: string
  profileRole: string | undefined
  preview: Pick<UserPreviewSessionState, 'active' | 'simulatedRole'> | null
  currentHostname: string
}): string | null {
  const appDomain = normalizeViteAppDomain(input.appDomain)
  if (appDomain === 'localhost') return null

  const marketOrigin = buildStoreUrl(input.newStoreSubdomain, appDomain)
  let targetHost: string
  try {
    targetHost = new URL(marketOrigin).hostname.toLowerCase()
  } catch {
    return null
  }
  if (input.currentHostname.toLowerCase() === targetHost) return null

  const path = getHomeDashboardPath(input.profileRole, input.preview)
  return `${marketOrigin}${path}`
}

export function isSuperAdminManagementPath(pathname: string): boolean {
  return pathname.startsWith('/super-admin')
}
