// Hook: Alle Versionen laden (für KW-Selector)

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest, getAccessTokenFromStorage } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import type { Version } from '@/types/database'

const TOAST_DELAY_MS = 1500

export interface UseVersionsOptions {
  /** false z. B. Kiosk-Livemodus: nutzt nur version/active, spart große Liste. */
  enabled?: boolean
}

/**
 * Lädt ALLE Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useVersions(options?: UseVersionsOptions) {
  const { enabled = true } = options ?? {}
  const result = useQuery<Version[]>({
    queryKey: ['versions'],
    staleTime: 2 * 60_000,
    enabled,
    // Bei 'Nicht angemeldet' (Cookie-Storage-Race direkt nach Login/Cache-Restore) automatisch retryen.
    retry: (failureCount, error) => {
      const msg = (error as { message?: string })?.message ?? ''
      if (msg.startsWith('Nicht angemeldet')) return failureCount < 3
      return false
    },
    retryDelay: 250,
    queryFn: async () => {
      // #region agent log
      try {
        fetch('http://127.0.0.1:7267/ingest/590f247d-2c6b-46fa-9217-a3f682ace41c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '97321b' },
          body: JSON.stringify({
            sessionId: '97321b',
            runId: 'pre-fix',
            hypothesisId: 'H5',
            location: 'useVersions.ts:queryFn',
            message: 'versions fetch start',
            data: {
              hasStorageJwt: Boolean(getAccessTokenFromStorage()),
              origin: typeof window !== 'undefined' ? window.location.origin : '',
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {})
      } catch {
        /* ignore */
      }
      // #endregion
      const data = await queryRest<Version[]>('versions', {
        select: '*',
        order: 'jahr.desc,kw_nummer.desc',
      })
      return data ?? []
    },
  })

  useEffect(() => {
    if (!result.isError || result.isRefetching || !result.error) return
    const t = setTimeout(() => {
      if (isAbortError(result.error)) return
      const errorMsg = (result.error as { message?: string })?.message ?? ''
      // 'Nicht angemeldet' = transienter Cookie-Storage-Race direkt nach Login.
      // React Query retryt bereits; kein User-Toast noetig.
      if (errorMsg.startsWith('Nicht angemeldet')) {
        console.warn('[useVersions] Auth-Race transient – kein Toast', errorMsg)
        return
      }
      toast.error('Versionen laden fehlgeschlagen: ' + (errorMsg || 'Unbekannter Fehler'))
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
