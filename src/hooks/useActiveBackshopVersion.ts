// Hook: Aktive Backshop-Version laden (status = 'active')

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  const result = useQuery<BackshopVersion | null>({
    queryKey: ['backshop-version', 'active'],
    staleTime: 60_000,
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
      const msg =
        'Keine Backshop-Version gefunden: ' +
        ((result.error as { message?: string })?.message ?? 'Unbekannter Fehler')
      toast.error(msg)
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
