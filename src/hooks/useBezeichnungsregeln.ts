// Hook: Bezeichnungsregeln CRUD + Anwendung

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest } from '@/lib/supabase'
import { applyAllRulesWithRenamedMerge } from '@/lib/keyword-rules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { Bezeichnungsregel, Database, MasterPLUItem, RenamedItem } from '@/types/database'

type RegelInsert = {
  keyword: string
  position: 'PREFIX' | 'SUFFIX'
  case_sensitive?: boolean
  is_active?: boolean
  created_by?: string | null
}

/** Lädt Bezeichnungsregeln für den aktuellen Markt */
export function useBezeichnungsregeln() {
  const { currentStoreId } = useCurrentStore()

  return useQuery<Bezeichnungsregel[]>({
    queryKey: ['bezeichnungsregeln', currentStoreId],
    staleTime: 5 * 60_000,
    enabled: !!currentStoreId,
    queryFn: async () => {
      if (!currentStoreId) return []
      const data = await queryRest<Bezeichnungsregel[]>('bezeichnungsregeln', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'created_at.asc',
      })
      return data ?? []
    },
  })
}

/** Neue Bezeichnungsregel erstellen */
export function useCreateBezeichnungsregel() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (regel: RegelInsert) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { error } = await supabase
        .from('bezeichnungsregeln')
        .insert(({ ...regel, store_id: currentStoreId } as Database['public']['Tables']['bezeichnungsregeln']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln', currentStoreId] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Bezeichnungsregel aktualisieren (z.B. aktivieren/deaktivieren, Keyword/Position ändern) */
export function useUpdateBezeichnungsregel() {
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
        .from('bezeichnungsregeln')
        .update((updates as Database['public']['Tables']['bezeichnungsregeln']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln', currentStoreId] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Bezeichnungsregel löschen */
export function useDeleteBezeichnungsregel() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bezeichnungsregeln')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bezeichnungsregeln', currentStoreId] })
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}

/** Ergebnis von „Regeln anwenden“: keine Persistenz in master_plu_items (nur marktspezifisch in renamed_items). */
export type ApplyObstRulesResult = {
  /** In renamed_items geschriebene Zeilen (aktueller Markt) */
  persistedRenamedCount: number
  /** Logisch von Regeln betroffene Zeilen (inkl. Master ohne DB-Schreibzugriff) */
  affectedByRulesCount: number
}

/**
 * Wendet alle aktiven Regeln auf die Items der aktiven Version an.
 * Nutzt gecachte Daten aus dem Query-Client; bei fehlendem Cache einmalig fetchen.
 * Schreibt nur noch marktspezifische Umbenennungen in renamed_items (keine Updates in master_plu_items).
 */
const PARALLEL_UPDATE_CHUNK = 10

export function useApplyAllRules() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (): Promise<ApplyObstRulesResult> => {
      if (!currentStoreId) {
        throw new Error('Kein Markt ausgewählt.')
      }

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

      // Regeln aus Cache oder einmalig laden (pro Markt)
      let activeRegeln = queryClient.getQueryData<Bezeichnungsregel[]>(['bezeichnungsregeln', currentStoreId])
      if (!activeRegeln) {
        const { data: regeln, error: regelnError } = await supabase
          .from('bezeichnungsregeln')
          .select('*')
          .eq('store_id', currentStoreId)
          .eq('is_active', true)
        if (regelnError) throw regelnError
        activeRegeln = (regeln ?? []) as Bezeichnungsregel[]
      }

      let renamedRows = queryClient.getQueryData<RenamedItem[]>(['renamed-items', currentStoreId])
      if (!renamedRows) {
        const { data, error: renamedError } = await supabase
          .from('renamed_items')
          .select('*')
          .eq('store_id', currentStoreId)
        if (renamedError) throw renamedError
        renamedRows = (data ?? []) as RenamedItem[]
      }

      const { masterUpdates, renamedUpdates } = applyAllRulesWithRenamedMerge(
        allItems,
        renamedRows,
        activeRegeln,
      )
      const affectedByRulesCount = masterUpdates.length + renamedUpdates.length
      if (affectedByRulesCount === 0) {
        return { persistedRenamedCount: 0, affectedByRulesCount: 0 }
      }

      // Keine Persistenz in master_plu_items (zentral) – Namensdarstellung nur über Layout-Engine je Markt

      for (let i = 0; i < renamedUpdates.length; i += PARALLEL_UPDATE_CHUNK) {
        const chunk = renamedUpdates.slice(i, i + PARALLEL_UPDATE_CHUNK)
        await Promise.all(
          chunk.map((u) =>
            supabase
              .from('renamed_items')
              .update({
                display_name: u.display_name,
                is_manually_renamed: u.is_manually_renamed,
              } as Database['public']['Tables']['renamed_items']['Update'] as never)
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
      if (data.persistedRenamedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['renamed-items', currentStoreId] })
      }
    },
    onError: (error) => {
      toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
    },
  })
}
