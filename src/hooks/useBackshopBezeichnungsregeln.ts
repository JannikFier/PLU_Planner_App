// Hook: Backshop-Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { applyAllRulesToItems } from '@/lib/keyword-rules'
import type {
  BackshopBezeichnungsregel,
  BackshopMasterPLUItem,
  Database,
} from '@/types/database'

type RegelInsert = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  case_sensitive?: boolean
  is_active?: boolean
  created_by?: string | null
}

/** Lädt alle Backshop-Bezeichnungsregeln */
export function useBackshopBezeichnungsregeln() {
  return useQuery<BackshopBezeichnungsregel[]>({
    queryKey: ['backshop-bezeichnungsregeln'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as BackshopBezeichnungsregel[]
    },
  })
}

/** Neue Backshop-Bezeichnungsregel erstellen */
export function useCreateBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (regel: RegelInsert) => {
      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .insert((regel as Database['public']['Tables']['backshop_bezeichnungsregeln']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Backshop-Bezeichnungsregel aktualisieren */
export function useUpdateBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()

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
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Backshop-Bezeichnungsregel löschen */
export function useDeleteBackshopBezeichnungsregel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backshop_bezeichnungsregeln')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-bezeichnungsregeln'] })
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

  return useMutation({
    mutationFn: async () => {
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

      let activeRegeln = queryClient.getQueryData<BackshopBezeichnungsregel[]>(['backshop-bezeichnungsregeln'])
      if (!activeRegeln) {
        const { data: regeln, error: regelnError } = await supabase
          .from('backshop_bezeichnungsregeln')
          .select('*')
          .eq('is_active', true)
        if (regelnError) throw regelnError
        activeRegeln = (regeln ?? []) as BackshopBezeichnungsregel[]
      }

      const updates = applyAllRulesToItems(
        allItems as unknown as import('@/types/database').MasterPLUItem[],
        activeRegeln as unknown as import('@/types/database').Bezeichnungsregel[],
      )
      if (updates.length === 0) return { updatedCount: 0 }

      for (let i = 0; i < updates.length; i += PARALLEL_UPDATE_CHUNK) {
        const chunk = updates.slice(i, i + PARALLEL_UPDATE_CHUNK)
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

      return { updatedCount: updates.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}
