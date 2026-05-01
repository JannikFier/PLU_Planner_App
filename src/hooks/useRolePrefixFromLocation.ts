import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Rollen-Pfad-Prefix aus aktueller URL (nicht aus Auth-Rolle), damit Super-Admin in User-Ansicht dort bleibt.
 */
export function useRolePrefixFromLocation(): string {
  const { pathname } = useLocation()
  return useMemo(
    () =>
      pathname.startsWith('/super-admin')
        ? '/super-admin'
        : pathname.startsWith('/admin')
          ? '/admin'
          : pathname.startsWith('/viewer')
            ? '/viewer'
            : pathname.startsWith('/kiosk')
              ? '/kiosk'
              : '/user',
    [pathname],
  )
}
