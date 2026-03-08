// Hook: Alle Versionen laden (für KW-Selector)

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { isAbortError } from '@/lib/error-utils'
import type { Version } from '@/types/database'

const TOAST_DELAY_MS = 1500

/**
 * Lädt ALLE Versionen, sortiert nach Jahr + KW absteigend (neueste zuerst).
 * Wird im KWSelector verwendet.
 * Toast erst nach Verzögerung, damit kurze Fehler (sofortiger Refetch-Erfolg) nicht aufblitzen.
 */
export function useVersions() {
  const result = useQuery<Version[]>({
    queryKey: ['versions'],
    staleTime: 2 * 60_000,
    queryFn: () =>
      withRetryOnAbort(async () => {
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .order('jahr', { ascending: false })
          .order('kw_nummer', { ascending: false })

        if (error) {
          throw error
        }
        return (data ?? []) as Version[]
      }),
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
