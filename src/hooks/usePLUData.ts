// Hook: PLU-Items für eine bestimmte Version laden

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import type { MasterPLUItem } from '@/types/database'

const TOAST_DELAY_MS = 1500

export interface UsePLUDataOptions {
  enabled?: boolean
}

/**
 * Lädt alle master_plu_items für eine gegebene Version-ID.
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
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
    queryFn: async () => {
      if (!versionId) return []

      const data = await queryRest<MasterPLUItem[]>('master_plu_items', {
        select: '*',
        version_id: `eq.${versionId}`,
        order: 'system_name.asc',
      })
      return data ?? []
    },
  })

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
