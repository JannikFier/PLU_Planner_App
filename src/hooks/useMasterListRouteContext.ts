import { useRolePrefixFromLocation } from '@/hooks/useRolePrefixFromLocation'

export type MasterListRouteMode = 'user' | 'admin' | 'viewer' | 'kiosk'

/**
 * Ableitungen aus Route für MasterList (Prefix aus URL, Lesemodus, Kiosk-Archiv-Skip).
 */
export function useMasterListRouteContext(mode: MasterListRouteMode, isSnapshot: boolean) {
  const rolePrefix = useRolePrefixFromLocation()

  const readOnlyListMode = mode === 'viewer' || mode === 'kiosk'

  /** Kiosk nutzt nur die aktive KW (kein Archiv-URL): volle versions-Liste spart einen großen REST-Call. */
  const kioskLiveSkipVersions = mode === 'kiosk' && !isSnapshot

  return { rolePrefix, readOnlyListMode, kioskLiveSkipVersions }
}
