// Markt-Carryover: eine KW, letzte Änderung gewinnt.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryRest, supabase } from '@/lib/supabase'
import { ensureProfileCurrentStoreId } from '@/lib/ensure-profile-current-store'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import type { Database, StoreListCarryover } from '@/types/database'
import { removedObstMasterToCarryoverInsert, removedBackshopMasterToCarryoverInsert } from '@/lib/carryover-master-snapshot'
import type { BackshopMasterPLUItem, MasterPLUItem } from '@/types/database'

export type CarryoverRowWithEditor = StoreListCarryover & { last_editor_label?: string | null }

export function useStoreListCarryoverRows(
  listType: 'obst' | 'backshop',
  forVersionId: string | undefined,
) {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['store-list-carryover', currentStoreId, listType, forVersionId],
    queryFn: async (): Promise<CarryoverRowWithEditor[]> => {
      if (!currentStoreId || !forVersionId) return []
      const rows = await queryRest<StoreListCarryover[]>('store_list_carryover', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        list_type: `eq.${listType}`,
        for_version_id: `eq.${forVersionId}`,
      })
      const list = rows ?? []
      const editorIds = [...new Set(list.map((r) => r.updated_by).filter(Boolean))] as string[]
      const nameById = new Map<string, string>()
      if (editorIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, display_name, email')
          .in('id', editorIds)
        for (const p of (profs ?? []) as { id: string; display_name: string | null; email: string }[]) {
          nameById.set(p.id, p.display_name?.trim() || p.email || p.id.slice(0, 8))
        }
      }
      return list.map((r) => ({
        ...r,
        last_editor_label: r.updated_by ? (nameById.get(r.updated_by) ?? null) : null,
      }))
    },
    enabled: !!currentStoreId && !!forVersionId,
    staleTime: 30_000,
  })
}

type UpsertObstPayload = {
  listType: 'obst'
  forVersionId: string
  fromVersionId: string
  item: MasterPLUItem
  marketInclude: boolean
}

type UpsertBackshopPayload = {
  listType: 'backshop'
  forVersionId: string
  fromVersionId: string
  item: BackshopMasterPLUItem
  marketInclude: boolean
}

export type UpsertCarryoverPayload = UpsertObstPayload | UpsertBackshopPayload

export function useUpsertStoreListCarryover() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (payload: UpsertCarryoverPayload) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      await ensureProfileCurrentStoreId(user.id, currentStoreId)

      const base =
        payload.listType === 'obst'
          ? removedObstMasterToCarryoverInsert(
              currentStoreId,
              payload.forVersionId,
              payload.fromVersionId,
              payload.item,
            )
          : removedBackshopMasterToCarryoverInsert(
              currentStoreId,
              payload.forVersionId,
              payload.fromVersionId,
              payload.item,
            )

      const row = {
        ...base,
        market_include: payload.marketInclude,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as Database['public']['Tables']['store_list_carryover']['Insert']

      const { error } = await supabase
        .from('store_list_carryover')
        .upsert(row as never, {
          onConflict: 'store_id,list_type,for_version_id,plu',
        })

      if (error) {
        throw error
      }
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['store-list-carryover', currentStoreId, payload.listType, payload.forVersionId],
      })
      queryClient.invalidateQueries({ queryKey: ['plu-items', payload.forVersionId] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items', payload.forVersionId] })
      if (payload.listType === 'backshop') {
        void queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
      }
    },
    onError: (e) => {
      const em = e as { message?: string }
      toast.error(`Carryover: ${e instanceof Error ? e.message : em.message?.trim() || 'Unbekannt'}`)
    },
  })
}
