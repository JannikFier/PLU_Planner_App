// Hook: Alle Backshop-Versionen laden (für KW-Selector)

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { queryRest } from '@/lib/supabase'
import type { BackshopVersion } from '@/types/database'

/**
 * Lädt alle Backshop-Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useBackshopVersions() {
  const { session, isLoading: authLoading } = useAuth()
  const restReady = !authLoading && Boolean(session?.access_token)

  return useQuery<BackshopVersion[]>({
    queryKey: ['backshop-versions'],
    staleTime: 2 * 60_000,
    enabled: restReady,
    // Bei 'Nicht angemeldet' (Cookie-Storage-Race direkt nach Login/Cache-Restore) automatisch retryen.
    retry: (failureCount, error) => {
      const msg = (error as { message?: string })?.message ?? ''
      if (msg.startsWith('Nicht angemeldet')) return failureCount < 3
      return false
    },
    retryDelay: 250,
    queryFn: async () => {
      try {
        const data = await queryRest<BackshopVersion[]>('backshop_versions', {
          select: '*',
          order: 'jahr.desc,kw_nummer.desc',
        })
        return data ?? []
      } catch (err) {
        const msg = (err as Error)?.message ?? 'Unbekannter Fehler'
        if (msg.startsWith('Nicht angemeldet')) {
          // Race direkt nach Login: kein Toast, React Query retryt automatisch.
          console.warn('[useBackshopVersions] Auth-Race transient – kein Toast', msg)
        } else {
          toast.error('Backshop-Versionen laden fehlgeschlagen: ' + msg)
        }
        throw err
      }
    },
  })
}
