// Hook: Backshop-Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { applyAllRulesWithRenamedMerge } from '@/lib/keyword-rules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type {
  BackshopBezeichnungsregel,
  BackshopMasterPLUItem,
  BackshopRenamedItem,
  Bezeichnungsregel,
  Database,
} from '@/types/database'

type RegelInsert = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  case_sensitive?: boolean
  is_active?: boolean
  created_by?: string | null
}

/** Lädt Backshop-Bezeichnungsregeln für den aktuellen Markt */
export function useBackshopBezeichnungsregeln() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<BackshopBezeichnungsregel[]>({
    queryKey: ['backshop-bezeichnungsregeln', currentStoreId],
    staleTime: 5 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<BackshopBezeichnungsregel[]>('backshop_bezeichnungsregeln', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'created_at.asc',
      })
      return data ?? []
    },
  })
}

/** Neue Backshop-Bezeichnungsregel erstellen */
export function useCreateBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (regel: RegelInsert) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const now = new Date().toISOString()
        const fake: BackshopBezeichnungsregel = {
          id: crypto.randomUUID(),
          store_id: currentStoreId,
          keyword: regel.keyword,
          position: regel.position,
          case_sensitive: regel.case_sensitive ?? false,
          is_active: regel.is_active ?? true,
          created_at: now,
          created_by: regel.created_by ?? null,
        }
        queryClient.setQueryData<BackshopBezeichnungsregel[]>(
          ['backshop-bezeichnungsregeln', currentStoreId],
          (old) => [...(old ?? []), fake],
        )
        return
      }

      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .insert(({ ...regel, store_id: currentStoreId } as Database['public']['Tables']['backshop_bezeichnungsregeln']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Backshop-Bezeichnungsregel aktualisieren */
export function useUpdateBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      is_active?: boolean
      keyword?: string
      position?: 'PREFIX' | 'SUFFIX'
    }) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopBezeichnungsregel[]>(
          ['backshop-bezeichnungsregeln', currentStoreId],
          (old) => (old ?? []).map((r) => (r.id === id ? { ...r, ...updates } : r)),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .update((updates as Database['public']['Tables']['backshop_bezeichnungsregeln']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Backshop-Bezeichnungsregel löschen */
export function useDeleteBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopBezeichnungsregel[]>(
          ['backshop-bezeichnungsregeln', currentStoreId],
          (old) => (old ?? []).filter((r) => r.id !== id),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

const PARALLEL_UPDATE_CHUNK = 10

/** Ergebnis von „Regeln anwenden“ Backshop: keine Persistenz in backshop_master_plu_items. */
export type ApplyBackshopRulesResult = {
  persistedRenamedCount: number
  affectedByRulesCount: number
}

/**
 * Wendet alle aktiven Backshop-Regeln auf die Items der aktiven Backshop-Version an.
 * Schreibt nur marktspezifische Umbenennungen in backshop_renamed_items (keine Updates in backshop_master_plu_items).
 */
export function useApplyAllBackshopRules() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (): Promise<ApplyBackshopRulesResult> => {
      if (!currentStoreId) {
        throw new Error('Kein Markt ausgewählt.')
      }

      let activeVersion = queryClient.getQueryData<unknown>(['backshop-version', 'active'])
      if (!activeVersion) {
        const { data, error } = await supabase
          .from('backshop_versions')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Keine aktive Backshop-Version gefunden')
        activeVersion = data
      }
      const versionId = (activeVersion as { id: string }).id

      let allItems = queryClient.getQueryData<BackshopMasterPLUItem[]>(['backshop-plu-items', versionId])
      if (!allItems) {
        const { data: items, error: itemsError } = await supabase
          .from('backshop_master_plu_items')
          .select('*')
          .eq('version_id', versionId)
        if (itemsError) throw itemsError
        allItems = (items ?? []) as BackshopMasterPLUItem[]
      }

      let activeRegeln = queryClient.getQueryData<BackshopBezeichnungsregel[]>([
        'backshop-bezeichnungsregeln',
        currentStoreId,
      ])
      if (!activeRegeln) {
        const { data: regeln, error: regelnError } = await supabase
          .from('backshop_bezeichnungsregeln')
          .select('*')
          .eq('store_id', currentStoreId)
          .eq('is_active', true)
        if (regelnError) throw regelnError
        activeRegeln = (regeln ?? []) as BackshopBezeichnungsregel[]
      }

      let renamedRows = queryClient.getQueryData<BackshopRenamedItem[]>([
        'backshop-renamed-items',
        currentStoreId,
      ])
      if (!renamedRows) {
        const { data, error: renamedError } = await supabase
          .from('backshop_renamed_items')
          .select('*')
          .eq('store_id', currentStoreId)
        if (renamedError) throw renamedError
        renamedRows = (data ?? []) as BackshopRenamedItem[]
      }

      const renamedForMerge = renamedRows.map((r) => ({
        plu: r.plu,
        store_id: r.store_id,
        display_name: r.display_name,
        is_manually_renamed: r.is_manually_renamed,
      }))

      const { masterUpdates, renamedUpdates } = applyAllRulesWithRenamedMerge(
        allItems,
        renamedForMerge,
        activeRegeln as unknown as Bezeichnungsregel[],
      )
      const affectedByRulesCount = masterUpdates.length + renamedUpdates.length
      if (affectedByRulesCount === 0) {
        return { persistedRenamedCount: 0, affectedByRulesCount: 0 }
      }

      if (isTestModeActive()) {
        if (renamedUpdates.length === 0) {
          return { persistedRenamedCount: 0, affectedByRulesCount }
        }
        const now = new Date().toISOString()
        queryClient.setQueryData<BackshopRenamedItem[]>(
          ['backshop-renamed-items', currentStoreId],
          (old) => {
            const list = [...(old ?? [])]
            for (const u of renamedUpdates) {
              const idx = list.findIndex((r) => r.plu === u.plu && r.store_id === u.store_id)
              if (idx >= 0) {
                list[idx] = {
                  ...list[idx],
                  display_name: u.display_name,
                  is_manually_renamed: u.is_manually_renamed,
                  updated_at: now,
                }
              } else {
                list.push({
                  id: crypto.randomUUID(),
                  plu: u.plu,
                  store_id: u.store_id,
                  display_name: u.display_name,
                  is_manually_renamed: u.is_manually_renamed,
                  image_url: null,
                  created_by: null,
                  created_at: now,
                  updated_at: now,
                })
              }
            }
            return list
          },
        )
        return {
          persistedRenamedCount: renamedUpdates.length,
          affectedByRulesCount,
        }
      }

      for (let i = 0; i < renamedUpdates.length; i += PARALLEL_UPDATE_CHUNK) {
        const chunk = renamedUpdates.slice(i, i + PARALLEL_UPDATE_CHUNK)
        await Promise.all(
          chunk.map((u) =>
            supabase
              .from('backshop_renamed_items')
              .update({
                display_name: u.display_name,
                is_manually_renamed: u.is_manually_renamed,
              } as Database['public']['Tables']['backshop_renamed_items']['Update'] as never)
              .eq('plu', u.plu)
              .eq('store_id', u.store_id)
              .then(({ error }) => {
                if (error) throw error
              }),
          ),
        )
      }

      return {
        persistedRenamedCount: renamedUpdates.length,
        affectedByRulesCount,
      }
    },
    onSuccess: (data) => {
      if (data.persistedRenamedCount > 0 && !isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-renamed-items', currentStoreId] })
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}
