// Manuelle Backshop-Nachbesserungen (source manual + is_manual_supplement)

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import type { BackshopMasterPLUItem } from '@/types/database'

export function useBackshopManualSupplements(versionId: string | undefined, enabled: boolean) {
  return useQuery<BackshopMasterPLUItem[]>({
    queryKey: ['backshop-manual-supplements', versionId],
    enabled: !!versionId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
        select: '*',
        version_id: `eq.${versionId}`,
        source: 'eq.manual',
        is_manual_supplement: 'eq.true',
        order: 'plu.asc',
      })
      return data ?? []
    },
  })
}
