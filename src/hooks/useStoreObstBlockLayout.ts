// Markt: Obst – Block-Reihenfolge + Name→Block-Overrides (Lesen + Mutationen)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { normalizeSystemNameForBlockOverride } from '@/lib/block-override-utils'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { StoreObstBlockOrder, StoreObstNameBlockOverride } from '@/types/database'

const onMutationError = (error: unknown) => {
  toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
}

export function useStoreObstBlockOrder() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<StoreObstBlockOrder[]>({
    queryKey: ['store-obst-block-order', currentStoreId],
    staleTime: 2 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<StoreObstBlockOrder[]>('store_obst_block_order', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'order_index.asc',
      })
      return data ?? []
    },
  })
}

export function useStoreObstNameBlockOverrides() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<StoreObstNameBlockOverride[]>({
    queryKey: ['store-obst-name-block-override', currentStoreId],
    staleTime: 2 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<StoreObstNameBlockOverride[]>('store_obst_name_block_override', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
      })
      return data ?? []
    },
  })
}

/** Reihenfolge der Warengruppen nur für diesen Markt (upsert alle Zeilen). */
export function useReorderStoreObstBlocks() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (orderedBlockIds: string[]) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const rows: StoreObstBlockOrder[] = orderedBlockIds.map((block_id, order_index) => ({
          store_id: currentStoreId,
          block_id,
          order_index,
          updated_at: now,
        }))
        queryClient.setQueryData<StoreObstBlockOrder[]>(
          ['store-obst-block-order', currentStoreId],
          rows,
        )
        return
      }

      const rows = orderedBlockIds.map((block_id, order_index) => ({
        store_id: currentStoreId,
        block_id,
        order_index,
      }))
      const { error } = await supabase.from('store_obst_block_order').upsert(rows as never, {
        onConflict: 'store_id,block_id',
      })
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['store-obst-block-order', currentStoreId] })
      }
    },
    onError: onMutationError,
  })
}

/**
 * Markt-Zuordnung: Override setzen/entfernen.
 * Entspricht Master-block_id → Zeile löschen (kein unnötiger Override).
 */
export function useAssignObstProductBlockOverride() {
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
      const qk = ['store-obst-name-block-override', currentStoreId] as const

      if (isTestModeActive()) {
        if (targetBlockId === masterBlockId || targetBlockId === null) {
          queryClient.setQueryData<StoreObstNameBlockOverride[]>(qk, (old) =>
            (old ?? []).filter((r) => r.system_name_normalized !== key),
          )
          return
        }
        const now = new Date().toISOString()
        const row: StoreObstNameBlockOverride = {
          store_id: currentStoreId,
          system_name_normalized: key,
          block_id: targetBlockId,
          updated_at: now,
        }
        queryClient.setQueryData<StoreObstNameBlockOverride[]>(qk, (old) => {
          const list = [...(old ?? [])]
          const idx = list.findIndex((r) => r.system_name_normalized === key)
          if (idx >= 0) list[idx] = row
          else list.push(row)
          return list
        })
        return
      }

      if (targetBlockId === masterBlockId) {
        const { error } = await supabase
          .from('store_obst_name_block_override')
          .delete()
          .eq('store_id', currentStoreId)
          .eq('system_name_normalized', key)
        if (error) throw error
        return
      }

      if (targetBlockId === null) {
        const { error } = await supabase
          .from('store_obst_name_block_override')
          .delete()
          .eq('store_id', currentStoreId)
          .eq('system_name_normalized', key)
        if (error) throw error
        return
      }

      const { error } = await supabase.from('store_obst_name_block_override').upsert(
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
        queryClient.invalidateQueries({ queryKey: ['store-obst-name-block-override', currentStoreId] })
      }
    },
    onError: onMutationError,
  })
}
