// Hook: Aktive Version laden (status = 'active')

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { queryRest } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import type { Version } from '@/types/database'

const TOAST_DELAY_MS = 1500

/**
 * Lädt die aktuell aktive KW-Version aus der Datenbank.
 * Fallback: Neueste Version (nach Jahr + KW absteigend).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useActiveVersion() {
  const { session, isLoading: authLoading } = useAuth()
  /** queryRest braucht JWT; nach Profil-Cache ist session oft noch null – erst warten. */
  const restReady = !authLoading && Boolean(session?.access_token)

  const result = useQuery<Version | null>({
    queryKey: ['version', 'active'],
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
      const active = await queryRest<Version[]>('versions', {
        select: '*',
        status: 'eq.active',
        limit: '1',
      }, { signal })
      if (active && active.length > 0) return active[0]

      const latest = await queryRest<Version[]>('versions', {
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
      // React Query refetcht automatisch; kein User-Toast noetig.
      if (errorMsg.startsWith('Nicht angemeldet')) {
        console.warn('[useActiveVersion] Auth-Race transient – kein Toast', errorMsg)
        return
      }
      toast.error('Keine Version gefunden: ' + (errorMsg || 'Unbekannter Fehler'))
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
