// Hook: Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { applyAllRulesToItems } from '@/lib/keyword-rules'
import type { Bezeichnungsregel, Database, MasterPLUItem } from '@/types/database'

type RegelInsert = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  case_sensitive?: boolean
  is_active?: boolean
  created_by?: string | null
}

/** Lädt alle Bezeichnungsregeln */
export function useBezeichnungsregeln() {
  return useQuery<Bezeichnungsregel[]>({
    queryKey: ['bezeichnungsregeln'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bezeichnungsregeln')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as Bezeichnungsregel[]
    },
  })
}

/** Neue Bezeichnungsregel erstellen */
export function useCreateBezeichnungsregel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (regel: RegelInsert) => {
      const { error } = await supabase
        .from('bezeichnungsregeln')
        .insert((regel as Database['public']['Tables']['bezeichnungsregeln']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Bezeichnungsregel aktualisieren (z.B. aktivieren/deaktivieren, Keyword/Position ändern) */
export function useUpdateBezeichnungsregel() {
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
        .from('bezeichnungsregeln')
        .update((updates as Database['public']['Tables']['bezeichnungsregeln']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Bezeichnungsregel löschen */
export function useDeleteBezeichnungsregel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bezeichnungsregeln')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/**
 * Wendet alle aktiven Regeln auf die Items der aktiven Version an.
 * Nutzt gecachte Daten aus dem Query-Client; bei fehlendem Cache einmalig fetchen.
 * Schreibt display_name per parallelen Batch-Update in die DB.
 */
const PARALLEL_UPDATE_CHUNK = 10

export function useApplyAllRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Aktive Version aus Cache oder einmalig laden
      let activeVersion = queryClient.getQueryData<unknown>(['version', 'active'])
      if (!activeVersion) {
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Keine aktive Version gefunden')
        activeVersion = data
      }
      const versionId = (activeVersion as { id: string }).id

      // Items aus Cache oder einmalig laden
      let allItems = queryClient.getQueryData<MasterPLUItem[]>(['plu-items', versionId])
      if (!allItems) {
        const { data: items, error: itemsError } = await supabase
          .from('master_plu_items')
          .select('*')
          .eq('version_id', versionId)
        if (itemsError) throw itemsError
        allItems = (items ?? []) as MasterPLUItem[]
      }

      // Regeln aus Cache oder einmalig laden
      let activeRegeln = queryClient.getQueryData<Bezeichnungsregel[]>(['bezeichnungsregeln'])
      if (!activeRegeln) {
        const { data: regeln, error: regelnError } = await supabase
          .from('bezeichnungsregeln')
          .select('*')
          .eq('is_active', true)
        if (regelnError) throw regelnError
        activeRegeln = (regeln ?? []) as Bezeichnungsregel[]
      }

      const updates = applyAllRulesToItems(allItems, activeRegeln)
      if (updates.length === 0) return { updatedCount: 0 }

      // Parallele Updates in Chunks (statt sequentiell)
      for (let i = 0; i < updates.length; i += PARALLEL_UPDATE_CHUNK) {
        const chunk = updates.slice(i, i + PARALLEL_UPDATE_CHUNK)
        await Promise.all(
          chunk.map((update) =>
            supabase
              .from('master_plu_items')
              .update(
              ({ display_name: update.display_name } as Database['public']['Tables']['master_plu_items']['Update']) as never
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
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}
