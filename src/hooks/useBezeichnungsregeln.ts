// Hook: Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applyAllRulesToItems } from '@/lib/keyword-rules'
import type { Bezeichnungsregel, MasterPLUItem } from '@/types/database'

type RegelInsert = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  case_sensitive?: boolean
  is_active?: boolean
  created_by?: string | null
}

const BATCH_SIZE = 500

/** Lädt alle Bezeichnungsregeln */
export function useBezeichnungsregeln() {
  return useQuery<Bezeichnungsregel[]>({
    queryKey: ['bezeichnungsregeln'],
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
        .insert(regel as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
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
        .update(updates as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln'] })
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
  })
}

/**
 * Wendet alle aktiven Regeln auf die Items der aktiven Version an.
 * Schreibt display_name per Batch-Update in die DB.
 */
export function useApplyAllRules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Aktive Version laden
      const { data: activeVersion } = await supabase
        .from('versions')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!activeVersion) throw new Error('Keine aktive Version gefunden')
      const versionId = (activeVersion as { id: string }).id

      // Alle Items der aktiven Version laden
      const { data: items, error: itemsError } = await supabase
        .from('master_plu_items')
        .select('*')
        .eq('version_id', versionId)

      if (itemsError) throw itemsError
      const allItems = (items ?? []) as MasterPLUItem[]

      // Alle aktiven Regeln laden
      const { data: regeln, error: regelnError } = await supabase
        .from('bezeichnungsregeln')
        .select('*')
        .eq('is_active', true)

      if (regelnError) throw regelnError
      const activeRegeln = (regeln ?? []) as Bezeichnungsregel[]

      // Regeln anwenden
      const updates = applyAllRulesToItems(allItems, activeRegeln)

      if (updates.length === 0) return { updatedCount: 0 }

      // Batch-Update display_name
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE)
        for (const update of batch) {
          const { error } = await supabase
            .from('master_plu_items')
            .update({ display_name: update.display_name } as never)
            .eq('id', update.id)

          if (error) throw error
        }
      }

      return { updatedCount: updates.length }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
    },
  })
}
