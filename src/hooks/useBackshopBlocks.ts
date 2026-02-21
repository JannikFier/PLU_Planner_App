// Backshop Blocks: Warengruppen für Backshop-Liste – Lesen und CRUD

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { BackshopBlock, BackshopBlockRule, Database } from '@/types/database'

const onMutationError = (error: unknown) => {
  toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
}

/** Alle Backshop-Blocks laden (für Sortierung BY_BLOCK und Block-Namen) */
export function useBackshopBlocks() {
  return useQuery<BackshopBlock[]>({
    queryKey: ['backshop-blocks'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_blocks')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      return (data ?? []) as BackshopBlock[]
    },
  })
}

/** Lädt alle Backshop-Block-Regeln */
export function useBackshopBlockRules() {
  return useQuery<BackshopBlockRule[]>({
    queryKey: ['backshop-block-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_block_rules')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as BackshopBlockRule[]
    },
  })
}

/** Neuen Backshop-Block erstellen */
export function useCreateBackshopBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, order_index }: { name: string; order_index?: number }) => {
      const { data, error } = await supabase
        .from('backshop_blocks')
        .insert(
          ({ name, order_index: order_index ?? 0 } as Database['public']['Tables']['backshop_blocks']['Insert']) as never,
        )
        .select()
        .single()

      if (error) throw error
      return data as BackshopBlock
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-blocks'] })
    },
    onError: onMutationError,
  })
}

/** Backshop-Block umbenennen */
export function useUpdateBackshopBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('backshop_blocks')
        .update(({ name } as Database['public']['Tables']['backshop_blocks']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-blocks'] })
    },
    onError: onMutationError,
  })
}

/** Backshop-Block löschen */
export function useDeleteBackshopBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backshop_blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-blocks'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-block-rules'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
    },
    onError: onMutationError,
  })
}

/** Reihenfolge aller Backshop-Blöcke aktualisieren */
export function useReorderBackshopBlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blocks: { id: string; order_index: number }[]) => {
      for (const block of blocks) {
        const { error } = await supabase
          .from('backshop_blocks')
          .update(
            ({ order_index: block.order_index } as Database['public']['Tables']['backshop_blocks']['Update']) as never,
          )
          .eq('id', block.id)

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-blocks'], refetchType: 'all' })
    },
    onError: onMutationError,
  })
}

/** Backshop-Produkte einer Warengruppe zuweisen (block_id setzen) */
export function useAssignBackshopProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemIds, blockId }: { itemIds: string[]; blockId: string | null }) => {
      const { error } = await supabase
        .from('backshop_master_plu_items')
        .update(
          ({ block_id: blockId } as Database['public']['Tables']['backshop_master_plu_items']['Update']) as never,
        )
        .in('id', itemIds)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['backshop-blocks'], refetchType: 'all' })
    },
    onError: onMutationError,
  })
}

/** Neue Backshop-Block-Regel erstellen */
export function useCreateBackshopBlockRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rule: {
      block_id: string
      rule_type: 'NAME_CONTAINS' | 'NAME_REGEX' | 'PLU_RANGE'
      value: string
      case_sensitive?: boolean
    }) => {
      const { error } = await supabase
        .from('backshop_block_rules')
        .insert((rule as Database['public']['Tables']['backshop_block_rules']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-block-rules'] })
    },
    onError: onMutationError,
  })
}

/** Backshop-Block-Regel löschen */
export function useDeleteBackshopBlockRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backshop_block_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-block-rules'] })
    },
    onError: onMutationError,
  })
}
