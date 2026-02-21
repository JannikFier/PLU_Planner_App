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

  // Dashboard-Chunk der Rolle vorladen, damit Redirect/Navigation sofort den Chunk nutzen kann
  useEffect(() => {
    if (authLoading || !user || mustChangePassword || !profile?.role) return
    const role = profile.role
    if (role === 'super_admin') void import('@/pages/SuperAdminDashboard')
    else if (role === 'admin') void import('@/pages/AdminDashboard')
    else if (role === 'viewer') void import('@/pages/ViewerDashboard')
    else void import('@/pages/UserDashboard')
  }, [authLoading, user, mustChangePassword, profile?.role])

  return null
}
