// Hook: PLU-Items für eine bestimmte Version laden

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { isAbortError } from '@/lib/error-utils'
import type { MasterPLUItem } from '@/types/database'

const TOAST_DELAY_MS = 1500

export interface UsePLUDataOptions {
  enabled?: boolean
}

/**
 * Lädt alle master_plu_items für eine gegebene Version-ID.
 * Sortierung: alphabetisch nach system_name.
 * Nur aktiv wenn versionId vorhanden (und ggf. enabled).
 * Toast erst nach Verzögerung, damit kurze Fehler (sofortiger Refetch-Erfolg) nicht aufblitzen.
 */
export function usePLUData(
  versionId: string | undefined,
  options?: UsePLUDataOptions,
) {
  const { enabled = true } = options ?? {}
  const result = useQuery<MasterPLUItem[]>({
    queryKey: ['plu-items', versionId],
    enabled: !!versionId && enabled,
    staleTime: 2 * 60_000,
    queryFn: () =>
      withRetryOnAbort(async () => {
        if (!versionId) return []

        const { data, error } = await supabase
          .from('master_plu_items')
          .select('*')
          .eq('version_id', versionId)
          .order('system_name', { ascending: true })

        if (error) {
          throw error
        }

        return (data ?? []) as MasterPLUItem[]
      }),
  })

  // Toast nur nach Verzögerung anzeigen; wenn Refetch vorher erfolgreich, kein Toast
  useEffect(() => {
    if (!result.isError || result.isRefetching || !result.error) return
    const t = setTimeout(() => {
      if (isAbortError(result.error)) return
      const msg = 'PLU-Items laden fehlgeschlagen: ' + ((result.error as { message?: string })?.message ?? 'Unbekannter Fehler')
      toast.error(msg)
    }, TOAST_DELAY_MS)
    return () => clearTimeout(t)
  }, [result.isError, result.isRefetching, result.error])

  return result
}
