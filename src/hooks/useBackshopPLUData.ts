// Hook: Backshop-PLU-Items für eine bestimmte Version laden

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryRest } from '@/lib/supabase'
import type { BackshopMasterPLUItem } from '@/types/database'

export interface UseBackshopPLUDataOptions {
  enabled?: boolean
}

/**
 * Lädt alle backshop_master_plu_items für eine gegebene Backshop-Version-ID.
 * Nutzt queryRest (direkter REST-Call) statt supabase.from() um Hanging zu vermeiden.
 */
export function useBackshopPLUData(
  versionId: string | undefined,
  options?: UseBackshopPLUDataOptions,
) {
  const { enabled = true } = options ?? {}
  return useQuery<BackshopMasterPLUItem[]>({
    queryKey: ['backshop-plu-items', versionId],
    enabled: !!versionId && enabled,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!versionId) return []

      try {
        const data = await queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${versionId}`,
          order: 'system_name.asc',
        })
        return data ?? []
      } catch (err) {
        toast.error('Backshop-PLU-Items laden fehlgeschlagen: ' + ((err as Error)?.message ?? 'Unbekannter Fehler'))
        throw err
      }
    },
  })
}
