// Rausgefallene PLUs: Vorversion vs. aktive Version (Obst oder Backshop).

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import { backshopMasterPluItemsRemovedBetweenVersions, masterPluItemsRemovedBetweenVersions } from '@/lib/version-plu-diff'
import type { BackshopMasterPLUItem, MasterPLUItem } from '@/types/database'

export function useTransitionRemovedObstItems(
  activeVersionId: string | undefined,
  previousVersionId: string | undefined,
) {
  return useQuery({
    queryKey: ['transition-removed', 'obst', activeVersionId, previousVersionId],
    queryFn: async (): Promise<MasterPLUItem[]> => {
      if (!activeVersionId || !previousVersionId) return []
      const [prev, next] = await Promise.all([
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${previousVersionId}`,
        }),
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${activeVersionId}`,
        }),
      ])
      return masterPluItemsRemovedBetweenVersions(prev ?? [], next ?? [])
    },
    enabled: !!activeVersionId && !!previousVersionId,
    staleTime: 60_000,
  })
}

export function useTransitionRemovedBackshopItems(
  activeVersionId: string | undefined,
  previousVersionId: string | undefined,
) {
  return useQuery({
    queryKey: ['transition-removed', 'backshop', activeVersionId, previousVersionId],
    queryFn: async (): Promise<BackshopMasterPLUItem[]> => {
      if (!activeVersionId || !previousVersionId) return []
      const [prev, next] = await Promise.all([
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${previousVersionId}`,
        }),
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${activeVersionId}`,
        }),
      ])
      return backshopMasterPluItemsRemovedBetweenVersions(prev ?? [], next ?? [])
    },
    enabled: !!activeVersionId && !!previousVersionId,
    staleTime: 60_000,
  })
}
