// Obst/Backshop: ausstehende manuelle Nachbesserungen aus der Vor-KW zur Übernahme in die aktive Version

import { useQuery } from '@tanstack/react-query'
import { queryRest } from '@/lib/supabase'
import { filterPendingBackshopCarryover, filterPendingObstCarryover } from '@/lib/manual-supplement-carryover'
import type { BackshopMasterPLUItem, MasterPLUItem, Version, BackshopVersion } from '@/types/database'

function pickPreviousFrozen<T extends { status: string }>(sorted: T[]): T | null {
  const activeIdx = sorted.findIndex((v) => v.status === 'active')
  if (activeIdx < 0) return null
  const prev = sorted[activeIdx + 1]
  return prev?.status === 'frozen' ? prev : null
}

export function useObstManualSupplementCarryoverPending(versions: Version[] | undefined) {
  const sorted = versions ?? []
  const active = sorted.find((v) => v.status === 'active')
  const prevFrozen = pickPreviousFrozen(sorted)

  return useQuery({
    queryKey: ['manual-supplement-carryover-pending', 'obst', prevFrozen?.id, active?.id],
    enabled: !!prevFrozen?.id && !!active?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [supRows, actRows] = await Promise.all([
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${prevFrozen!.id}`,
          is_manual_supplement: 'eq.true',
        }),
        queryRest<MasterPLUItem[]>('master_plu_items', {
          select: '*',
          version_id: `eq.${active!.id}`,
        }),
      ])
      const pending = filterPendingObstCarryover(supRows ?? [], actRows ?? [])
      return {
        pendingCount: pending.length,
        fromVersionId: prevFrozen!.id,
        toVersionId: active!.id,
      }
    },
  })
}

export function useBackshopManualSupplementCarryoverPending(versions: BackshopVersion[] | undefined) {
  const sorted = versions ?? []
  const active = sorted.find((v) => v.status === 'active')
  const prevFrozen = pickPreviousFrozen(sorted)

  return useQuery({
    queryKey: ['manual-supplement-carryover-pending', 'backshop', prevFrozen?.id, active?.id],
    enabled: !!prevFrozen?.id && !!active?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const [supRows, actRows] = await Promise.all([
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${prevFrozen!.id}`,
          is_manual_supplement: 'eq.true',
        }),
        queryRest<BackshopMasterPLUItem[]>('backshop_master_plu_items', {
          select: '*',
          version_id: `eq.${active!.id}`,
        }),
      ])
      const pending = filterPendingBackshopCarryover(supRows ?? [], actRows ?? [])
      return {
        pendingCount: pending.length,
        fromVersionId: prevFrozen!.id,
        toVersionId: active!.id,
      }
    },
  })
}
