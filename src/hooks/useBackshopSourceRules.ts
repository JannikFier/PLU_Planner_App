// Backshop-Source-Rules pro Markt: bevorzugte Quelle pro Warengruppe (Bulk-Regel).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isTestModeActive } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useAuth } from '@/hooks/useAuth'
import type { BackshopSource, BackshopSourceRulePerStore } from '@/types/database'

export function useBackshopSourceRulesForStore(storeId: string | null | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['backshop-source-rules', storeId ?? '__none__'] as const
  return useQuery<BackshopSourceRulePerStore[]>({
    queryKey,
    enabled: !!storeId,
    queryFn: async () => {
      // Bug 2 Hardening: Im Testmodus patchen die Mutation-Hooks nur den
      // React-Query-Cache. Ein Live-Refetch wuerde diese Aenderungen
      // ueberschreiben und die Coach-Schritte inkonsistent wirken lassen.
      // Solange Testmodus aktiv UND Cache vorhanden, liefern wir den Cache.
      if (isTestModeActive()) {
        const existing = queryClient.getQueryData<BackshopSourceRulePerStore[]>(queryKey)
        if (existing) return existing
      }
      const { data, error } = await supabase
        .from('backshop_source_rules_per_store')
        .select('*')
        .eq('store_id', storeId!)
      if (error) throw error
      return (data ?? []) as BackshopSourceRulePerStore[]
    },
    staleTime: isTestModeActive() ? Number.POSITIVE_INFINITY : 30_000,
    refetchOnWindowFocus: !isTestModeActive(),
    refetchOnReconnect: !isTestModeActive(),
    refetchOnMount: !isTestModeActive(),
  })
}

export function useSaveBackshopSourceRule() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: { blockId: string; preferredSource: BackshopSource }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const preferred = input.preferredSource as BackshopSourceRulePerStore['preferred_source']
        const qk = ['backshop-source-rules', currentStoreId] as const
        queryClient.setQueryData<BackshopSourceRulePerStore[]>(qk, (old) => {
          const list = [...(old ?? [])]
          const idx = list.findIndex((r) => r.block_id === input.blockId)
          const row: BackshopSourceRulePerStore = {
            id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
            store_id: currentStoreId,
            block_id: input.blockId,
            preferred_source: preferred,
            created_at: idx >= 0 ? list[idx].created_at : now,
            updated_at: now,
            updated_by: user?.id ?? null,
          }
          if (idx >= 0) list[idx] = row
          else list.push(row)
          return list
        })
        return
      }

      const { error } = await supabase
        .from('backshop_source_rules_per_store')
        .upsert(
          ({
            store_id: currentStoreId,
            block_id: input.blockId,
            preferred_source: input.preferredSource,
            updated_by: user?.id ?? null,
          } as never),
          { onConflict: 'store_id,block_id' } as never,
        )
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-source-rules'] })
      }
    },
  })
}

export function useDeleteBackshopSourceRule() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  return useMutation({
    mutationFn: async (blockId: string) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopSourceRulePerStore[]>(
          ['backshop-source-rules', currentStoreId],
          (old) => (old ?? []).filter((r) => r.block_id !== blockId),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_source_rules_per_store')
        .delete()
        .eq('store_id', currentStoreId)
        .eq('block_id', blockId)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-source-rules'] })
      }
    },
  })
}
