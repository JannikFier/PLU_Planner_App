// Hook: Aktive Backshop-Version laden (status = 'active')

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { queryRest } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import type { BackshopVersion } from '@/types/database'

const TOAST_DELAY_MS = 1500

/**
 * Lädt die aktuell aktive Backshop-KW-Version.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 * Fehler-Toast wie useActiveVersion: kein Toast bei Abort (Navigation, Query-Abbruch).
 */
export function useActiveBackshopVersion() {
  const { session, isLoading: authLoading } = useAuth()
  const restReady = !authLoading && Boolean(session?.access_token)

  const result = useQuery<BackshopVersion | null>({
    queryKey: ['backshop-version', 'active'],
    staleTime: 60_000,
    enabled: restReady,
    // Bei 'Nicht angemeldet' (Cookie-Storage-Race direkt nach Login) automatisch retryen.
    retry: (failureCount, error) => {
      const msg = (error as { message?: string })?.message ?? ''
      if (msg.startsWith('Nicht angemeldet')) return failureCount < 3
      return false
    },
    retryDelay: 250,
    queryFn: async ({ signal }) => {
      const active = await queryRest<BackshopVersion[]>('backshop_versions', {
        select: '*',
        status: 'eq.active',
        limit: '1',
      }, { signal })
      if (active && active.length > 0) return active[0]

      const latest = await queryRest<BackshopVersion[]>('backshop_versions', {
        select: '*',
        order: 'jahr.desc,kw_nummer.desc',
        limit: '1',
      }, { signal })
      return latest?.[0] ?? null
    },
  })

  useEffect(() => {
    if (!result.isError || result.isRefetching || !result.error) return
    const t = setTimeout(() => {
      if (isAbortError(result.error)) return
      const errorMsg = (result.error as { message?: string })?.message ?? ''
      // 'Nicht angemeldet' = transienter Cookie-Storage-Race direkt nach Login.
      // React Query refetcht automatisch beim naechsten Mount/Stale; kein User-Toast noetig.
      if (errorMsg.startsWith('Nicht angemeldet')) {
        console.warn('[useActiveBackshopVersion] Auth-Race transient – kein Toast', errorMsg)
        return
      }
      toast.error('Keine Backshop-Version gefunden: ' + (errorMsg || 'Unbekannter Fehler'))
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
