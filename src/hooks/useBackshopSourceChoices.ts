// Backshop-Source-Choices pro Markt: welche Quellen pro Produktgruppe sichtbar sind.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isTestModeActive } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useAuth } from '@/hooks/useAuth'
import type { BackshopSource, BackshopSourceChoicePerStore } from '@/types/database'

function toStoredChosenSources(sources: BackshopSource[]): BackshopSourceChoicePerStore['chosen_sources'] {
  const allowed: BackshopSourceChoicePerStore['chosen_sources'][number][] = ['edeka', 'harry', 'aryzta']
  return sources.filter((s): s is (typeof allowed)[number] => allowed.includes(s as (typeof allowed)[number]))
}

export function useBackshopSourceChoicesForStore(storeId: string | null | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['backshop-source-choices', storeId ?? '__none__'] as const
  return useQuery<BackshopSourceChoicePerStore[]>({
    queryKey,
    enabled: !!storeId,
    queryFn: async () => {
      // Bug 2 Hardening: Im Testmodus patchen Save/BulkApply nur den
      // React-Query-Cache. Ein Live-Refetch wuerde diese Aenderungen
      // ueberschreiben. Cache wird beibehalten, solange Testmodus aktiv ist.
      if (isTestModeActive()) {
        const existing = queryClient.getQueryData<BackshopSourceChoicePerStore[]>(queryKey)
        if (existing) return existing
      }
      const { data, error } = await supabase
        .from('backshop_source_choice_per_store')
        .select('*')
        .eq('store_id', storeId!)
      if (error) throw error
      return (data ?? []) as BackshopSourceChoicePerStore[]
    },
    staleTime: isTestModeActive() ? Number.POSITIVE_INFINITY : 30_000,
    refetchOnWindowFocus: !isTestModeActive(),
    refetchOnReconnect: !isTestModeActive(),
    refetchOnMount: !isTestModeActive(),
  })
}

export function useSaveBackshopSourceChoice() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: {
      groupId: string
      chosenSources: BackshopSource[]
      origin?: 'bulk' | 'manual'
    }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const chosen = toStoredChosenSources(input.chosenSources)

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const qk = ['backshop-source-choices', currentStoreId] as const
        queryClient.setQueryData<BackshopSourceChoicePerStore[]>(qk, (old) => {
          const list = [...(old ?? [])]
          const idx = list.findIndex((r) => r.group_id === input.groupId)
          const row: BackshopSourceChoicePerStore = {
            id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
            store_id: currentStoreId,
            group_id: input.groupId,
            chosen_sources: chosen,
            origin: input.origin ?? 'manual',
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
        .from('backshop_source_choice_per_store')
        .upsert(
          ({
            store_id: currentStoreId,
            group_id: input.groupId,
            chosen_sources: chosen,
            origin: input.origin ?? 'manual',
            updated_by: user?.id ?? null,
          } as never),
          { onConflict: 'store_id,group_id' } as never,
        )
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-source-choices'] })
        queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['backshop-line-visibility-overrides'] })
      }
    },
  })
}

export function useBulkApplyBackshopSourceChoice() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (entries: Array<{ groupId: string; chosenSources: BackshopSource[] }>) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const qk = ['backshop-source-choices', currentStoreId] as const
        queryClient.setQueryData<BackshopSourceChoicePerStore[]>(qk, (old) => {
          const list = [...(old ?? [])]
          for (const e of entries) {
            const chosen = toStoredChosenSources(e.chosenSources)
            const idx = list.findIndex((r) => r.group_id === e.groupId)
            const row: BackshopSourceChoicePerStore = {
              id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
              store_id: currentStoreId,
              group_id: e.groupId,
              chosen_sources: chosen,
              origin: 'bulk',
              created_at: idx >= 0 ? list[idx].created_at : now,
              updated_at: now,
              updated_by: user?.id ?? null,
            }
            if (idx >= 0) list[idx] = row
            else list.push(row)
          }
          return list
        })
        return
      }

      const rows = entries.map((e) => ({
        store_id: currentStoreId,
        group_id: e.groupId,
        chosen_sources: toStoredChosenSources(e.chosenSources),
        origin: 'bulk' as const,
        updated_by: user?.id ?? null,
      }))
      const { error } = await supabase
        .from('backshop_source_choice_per_store')
        .upsert(rows as never, { onConflict: 'store_id,group_id' } as never)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-source-choices'] })
        queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['backshop-line-visibility-overrides'] })
      }
    },
  })
}
