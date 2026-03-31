// Hook: Backshop-Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest } from '@/lib/supabase'
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
      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .insert(({ ...regel, store_id: currentStoreId } as Database['public']['Tables']['backshop_bezeichnungsregeln']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
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
      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .update((updates as Database['public']['Tables']['backshop_bezeichnungsregeln']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
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
      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln', currentStoreId] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

const PARALLEL_UPDATE_CHUNK = 10

/**
 * Wendet alle aktiven Backshop-Regeln auf die Items der aktiven Backshop-Version an.
 * Schreibt display_name in backshop_master_plu_items.
 */
export function useApplyAllBackshopRules() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async () => {
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
      const total = masterUpdates.length + renamedUpdates.length
      if (total === 0) return { updatedCount: 0 }

      for (let i = 0; i < masterUpdates.length; i += PARALLEL_UPDATE_CHUNK) {
        const chunk = masterUpdates.slice(i, i + PARALLEL_UPDATE_CHUNK)
        await Promise.all(
          chunk.map((update) =>
            supabase
              .from('backshop_master_plu_items')
              .update(
                ({ display_name: update.display_name } as Database['public']['Tables']['backshop_master_plu_items']['Update']) as never,
              )
              .eq('id', update.id)
              .then(({ error }) => {
                if (error) throw error
              }),
          ),
        )
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

      return { updatedCount: total }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-renamed-items', currentStoreId] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}
