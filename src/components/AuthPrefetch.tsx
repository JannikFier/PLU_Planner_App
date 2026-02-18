/**
 * Startet Prefetch für MasterList/Layout/Benutzerverwaltung sofort bei authentifiziertem User.
 * Läuft beim App-Start (bevor Dashboard geladen ist) – damit die Inhalts-Kasten
 * (PLU-Liste, Layout, Alle Benutzer) nach Reload schnell gefüllt sind.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { runMasterListPrefetch, runAdminPrefetch } from '@/hooks/usePrefetchForNavigation'

export function AuthPrefetch() {
  const { user, isLoading: authLoading, mustChangePassword, profile } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (authLoading || !user || mustChangePassword) return

    runMasterListPrefetch(queryClient)
    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      runAdminPrefetch(queryClient)
    }
  }, [authLoading, user, mustChangePassword, queryClient, profile?.role])

  return null
}
