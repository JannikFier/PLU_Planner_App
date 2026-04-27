// Markt: Backshop – Block-Reihenfolge + Name→Block-Overrides

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { normalizeSystemNameForBlockOverride } from '@/lib/block-override-utils'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { StoreBackshopBlockOrder, StoreBackshopNameBlockOverride } from '@/types/database'

const onMutationError = (error: unknown) => {
  toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
}

export function useStoreBackshopBlockOrder() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<StoreBackshopBlockOrder[]>({
    queryKey: ['store-backshop-block-order', currentStoreId],
    staleTime: 2 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<StoreBackshopBlockOrder[]>('store_backshop_block_order', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'order_index.asc',
      })
      return data ?? []
    },
  })
}

export function useStoreBackshopNameBlockOverrides() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<StoreBackshopNameBlockOverride[]>({
    queryKey: ['store-backshop-name-block-override', currentStoreId],
    staleTime: 2 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<StoreBackshopNameBlockOverride[]>('store_backshop_name_block_override', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
      })
      return data ?? []
    },
  })
}

export function useReorderStoreBackshopBlocks() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (orderedBlockIds: string[]) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const rows: StoreBackshopBlockOrder[] = orderedBlockIds.map((block_id, order_index) => ({
          store_id: currentStoreId,
          block_id,
          order_index,
          updated_at: now,
        }))
        queryClient.setQueryData<StoreBackshopBlockOrder[]>(
          ['store-backshop-block-order', currentStoreId],
          rows,
        )
        return
      }

      const rows = orderedBlockIds.map((block_id, order_index) => ({
        store_id: currentStoreId,
        block_id,
        order_index,
      }))
      const { error } = await supabase.from('store_backshop_block_order').upsert(rows as never, {
        onConflict: 'store_id,block_id',
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['store-backshop-block-order', currentStoreId] })
      }
    },
    onError: onMutationError,
  })
}

export function useAssignBackshopProductBlockOverride() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({
      systemName,
      masterBlockId,
      targetBlockId,
    }: {
      systemName: string
      masterBlockId: string | null
      targetBlockId: string | null
    }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const key = normalizeSystemNameForBlockOverride(systemName)
      const qk = ['store-backshop-name-block-override', currentStoreId] as const

      if (isTestModeActive()) {
        if (targetBlockId === masterBlockId || targetBlockId === null) {
          queryClient.setQueryData<StoreBackshopNameBlockOverride[]>(qk, (old) =>
            (old ?? []).filter((r) => r.system_name_normalized !== key),
          )
          return
        }
        const now = new Date().toISOString()
        const row: StoreBackshopNameBlockOverride = {
          store_id: currentStoreId,
          system_name_normalized: key,
          block_id: targetBlockId,
          updated_at: now,
        }
        queryClient.setQueryData<StoreBackshopNameBlockOverride[]>(qk, (old) => {
          const list = [...(old ?? [])]
          const idx = list.findIndex((r) => r.system_name_normalized === key)
          if (idx >= 0) list[idx] = row
          else list.push(row)
          return list
        })
        return
      }

      if (targetBlockId === masterBlockId || targetBlockId === null) {
        const { error } = await supabase
          .from('store_backshop_name_block_override')
          .delete()
          .eq('store_id', currentStoreId)
          .eq('system_name_normalized', key)
        if (error) throw error
        return
      }

      const { error } = await supabase.from('store_backshop_name_block_override').upsert(
        {
          store_id: currentStoreId,
          system_name_normalized: key,
          block_id: targetBlockId,
        } as never,
        { onConflict: 'store_id,system_name_normalized' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['store-backshop-name-block-override', currentStoreId] })
      }
    },
    onError: onMutationError,
  })
}
