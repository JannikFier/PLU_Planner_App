// Hook: Alle Versionen laden (für KW-Selector)

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import type { Version } from '@/types/database'

const TOAST_DELAY_MS = 1500

/**
 * Lädt ALLE Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useVersions() {
  const result = useQuery<Version[]>({
    queryKey: ['versions'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
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
      const msg = 'Versionen laden fehlgeschlagen: ' + ((result.error as { message?: string })?.message ?? 'Unbekannter Fehler')
      toast.error(msg)
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
