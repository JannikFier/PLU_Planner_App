/**
 * Startet Prefetch für MasterList/Layout sofort bei authentifiziertem User.
 * Läuft beim App-Start (bevor Dashboard geladen ist) – gibt dem Prefetch
 * einen deutlichen Zeitvorsprung vor dem Klick auf "Masterliste".
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { runMasterListPrefetch } from '@/hooks/usePrefetchForNavigation'

export function AuthPrefetch() {
  const { user, isLoading: authLoading, mustChangePassword } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (authLoading || !user || mustChangePassword) return

    runMasterListPrefetch(queryClient)
  }, [authLoading, user, mustChangePassword, queryClient])

  return null
}
