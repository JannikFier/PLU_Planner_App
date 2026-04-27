// Nur manuelle Nachbesserungen (is_manual_supplement) der gegebenen Obst-Version

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import type { MasterPLUItem } from '@/types/database'

export function useObstManualSupplements(versionId: string | undefined, enabled: boolean) {
  return useQuery<MasterPLUItem[]>({
    queryKey: ['obst-manual-supplements', versionId],
    enabled: !!versionId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await queryRest<MasterPLUItem[]>('master_plu_items', {
        select: '*',
        version_id: `eq.${versionId}`,
        is_manual_supplement: 'eq.true',
        order: 'plu.asc',
      })
      return data ?? []
    },
  })
}
