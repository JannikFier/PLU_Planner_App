// Hook: Warengruppen (Blöcke) + Block-Regeln – Lesen und CRUD

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Block, BlockRule } from '@/types/database'

/**
 * Lädt alle Blöcke (Warengruppen), sortiert nach order_index.
 */
export function useBlocks() {
  return useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      return (data ?? []) as Block[]
    },
  })
}

/** Lädt alle Block-Regeln */
export function useBlockRules() {
  return useQuery<BlockRule[]>({
    queryKey: ['block-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_rules')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as BlockRule[]
    },
  })
}

/** Neuen Block erstellen; gibt den erstellten Block zurück (für sofortige Auswahl im Dialog). */
export function useCreateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, order_index }: { name: string; order_index?: number }) => {
      const { data, error } = await supabase
        .from('blocks')
        .insert({ name, order_index: order_index ?? 0 } as never)
        .select()
        .single()

      if (error) throw error
      return data as Block
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

/** Block umbenennen */
export function useUpdateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('blocks')
        .update({ name } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] })
    },
  })
}

/** Block löschen */
export function useDeleteBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] })
      queryClient.invalidateQueries({ queryKey: ['block-rules'] })
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
    },
  })
}

/** Reihenfolge aller Blöcke aktualisieren */
export function useReorderBlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blocks: { id: string; order_index: number }[]) => {
      // Sequentiell updaten (Supabase hat kein Batch-Update)
      for (const block of blocks) {
        const { error } = await supabase
          .from('blocks')
          .update({ order_index: block.order_index } as never)
          .eq('id', block.id)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'], refetchType: 'all' })
    },
  })
}

/** Produkte einer Warengruppe zuweisen (block_id setzen) */
export function useAssignProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemIds, blockId }: { itemIds: string[]; blockId: string | null }) => {
      const { error } = await supabase
        .from('master_plu_items')
        .update({ block_id: blockId } as never)
        .in('id', itemIds)

      if (error) throw error
    },
    onSuccess: () => {
      // refetchType 'all': Auch inaktive Queries (andere Seiten) werden refetcht
      queryClient.invalidateQueries({ queryKey: ['plu-items'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['blocks'], refetchType: 'all' })
    },
  })
}

/** Neue Block-Regel erstellen */
export function useCreateBlockRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rule: {
      block_id: string
      rule_type: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
      value: string
      case_sensitive?: boolean
    }) => {
      const { error } = await supabase
        .from('block_rules')
        .insert(rule as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-rules'] })
    },
  })
}

/** Block-Regel löschen */
export function useDeleteBlockRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('block_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-rules'] })
    },
  })
}
