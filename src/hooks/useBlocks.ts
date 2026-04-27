// Hook: Warengruppen (Blöcke) + Block-Regeln – Lesen und CRUD

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { normalizeSystemNameForBlockOverride } from '@/lib/block-override-utils'
import type { Block, BlockRule, CustomProduct, Database, MasterPLUItem, Version } from '@/types/database'

const onMutationError = (error: unknown) => {
  toast.error('Fehler: ' + (error instanceof Error ? error.message : String(error)))
}

/**
 * Lädt alle Blöcke (Warengruppen), sortiert nach order_index.
 */
export function useBlocks() {
  return useQuery<Block[]>({
    queryKey: ['blocks'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const data = await queryRest<Block[]>('blocks', {
        select: '*',
        order: 'order_index.asc',
      })
      return data ?? []
    },
  })
}

/** Lädt alle Block-Regeln */
export function useBlockRules() {
  return useQuery<BlockRule[]>({
    queryKey: ['block-rules'],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const data = await queryRest<BlockRule[]>('block_rules', {
        select: '*',
        order: 'created_at.asc',
      })
      return data ?? []
    },
  })
}

/** Neuen Block erstellen; gibt den erstellten Block zurück (für sofortige Auswahl im Dialog). */
export function useCreateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, order_index }: { name: string; order_index?: number }) => {
      if (isTestModeActive()) {
        const fake: Block = {
          id: crypto.randomUUID(),
          name,
          order_index: order_index ?? 0,
          created_at: new Date().toISOString(),
        }
        queryClient.setQueryData<Block[]>(['blocks'], (old) => [...(old ?? []), fake])
        return fake
      }

      const { data, error } = await supabase
        .from('blocks')
        .insert(
        ({ name, order_index: order_index ?? 0 } as Database['public']['Tables']['blocks']['Insert']) as never
      )
        .select()
        .single()

      if (error) throw error
      return data as Block
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['blocks'] })
        queryClient.invalidateQueries({ queryKey: ['store-obst-block-order'] })
      }
    },
    onError: onMutationError,
  })
}

/** Block umbenennen */
export function useUpdateBlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<Block[]>(['blocks'], (old) =>
          (old ?? []).map((b) => (b.id === id ? { ...b, name } : b)),
        )
        return
      }

      const { error } = await supabase
        .from('blocks')
        .update(({ name } as Database['public']['Tables']['blocks']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['blocks'] })
      }
    },
    onError: onMutationError,
  })
}

/** Block löschen */
export function useDeleteBlock() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const norm = normalizeSystemNameForBlockOverride
      const nameSet = new Set<string>()

      if (isTestModeActive()) {
        for (const q of queryClient.getQueryCache().findAll({ queryKey: ['store-obst-name-block-override'] })) {
          const rows = queryClient.getQueryData<
            { store_id: string; system_name_normalized: string; block_id: string; updated_at: string }[]
          >(q.queryKey)
          for (const r of rows ?? []) {
            if (r.block_id === id) nameSet.add(r.system_name_normalized)
          }
        }
        queryClient.setQueryData<Block[]>(['blocks'], (old) => (old ?? []).filter((b) => b.id !== id))
        queryClient.setQueryData<BlockRule[]>(['block-rules'], (old) =>
          (old ?? []).filter((r) => r.block_id !== id),
        )
        queryClient.setQueriesData<MasterPLUItem[]>({ queryKey: ['plu-items'] }, (old) =>
          old
            ? old.map((it) =>
                it.block_id === id || nameSet.has(norm(it.system_name))
                  ? { ...it, block_id: null }
                  : it,
              )
            : old,
        )
        queryClient.setQueriesData<CustomProduct[]>({ queryKey: ['custom-products'] }, (old) =>
          old
            ? old.map((c) =>
                c.block_id === id || nameSet.has(norm(c.name)) ? { ...c, block_id: null } : c,
              )
            : old,
        )
        for (const q of queryClient.getQueryCache().findAll({ queryKey: ['store-obst-block-order'] })) {
          queryClient.setQueryData(
            q.queryKey,
            (rows: { store_id: string; block_id: string; order_index: number; updated_at: string }[] | undefined) =>
              (rows ?? []).filter((r) => r.block_id !== id),
          )
        }
        for (const q of queryClient.getQueryCache().findAll({ queryKey: ['store-obst-name-block-override'] })) {
          queryClient.setQueryData(
            q.queryKey,
            (rows: { store_id: string; system_name_normalized: string; block_id: string; updated_at: string }[] | undefined) =>
              (rows ?? []).filter((r) => r.block_id !== id),
          )
        }
        return
      }

      const activeVersion = queryClient.getQueryData<Version | null>(['version', 'active'])

      if (currentStoreId) {
        const { data: ovRows, error: ovErr } = await supabase
          .from('store_obst_name_block_override')
          .select('system_name_normalized')
          .eq('store_id', currentStoreId)
          .eq('block_id', id)
        if (ovErr) throw ovErr
        for (const r of (ovRows ?? []) as { system_name_normalized: string }[]) {
          nameSet.add(r.system_name_normalized)
        }
      }

      if (activeVersion?.id) {
        const { data: masters, error: mErr } = await supabase
          .from('master_plu_items')
          .select('id, system_name, block_id')
          .eq('version_id', activeVersion.id)
        if (mErr) throw mErr
        const masterRows = (masters ?? []) as Pick<MasterPLUItem, 'id' | 'system_name' | 'block_id'>[]
        const nullMasterIds = masterRows
          .filter(
            (m) => m.block_id === id || nameSet.has(norm(m.system_name)),
          )
          .map((m) => m.id)
        if (nullMasterIds.length > 0) {
          const { error: upErr } = await supabase
            .from('master_plu_items')
            .update(({ block_id: null } as Database['public']['Tables']['master_plu_items']['Update']) as never)
            .in('id', nullMasterIds)
          if (upErr) throw upErr
        }
      }

      if (currentStoreId) {
        const { data: customs, error: cErr } = await supabase
          .from('custom_products')
          .select('id, name, block_id')
          .eq('store_id', currentStoreId)
        if (cErr) throw cErr
        const customRows = (customs ?? []) as Pick<CustomProduct, 'id' | 'name' | 'block_id'>[]
        const nullCustomIds = customRows
          .filter((c) => c.block_id === id || nameSet.has(norm(c.name)))
          .map((c) => c.id)
        if (nullCustomIds.length > 0) {
          const { error: cuErr } = await supabase
            .from('custom_products')
            .update(({ block_id: null } as Database['public']['Tables']['custom_products']['Update']) as never)
            .in('id', nullCustomIds)
          if (cuErr) throw cuErr
        }
      }

      const { error } = await supabase.from('blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['blocks'] })
        queryClient.invalidateQueries({ queryKey: ['block-rules'] })
        queryClient.invalidateQueries({ queryKey: ['plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['store-obst-name-block-override'] })
        queryClient.invalidateQueries({ queryKey: ['store-obst-block-order'] })
        queryClient.invalidateQueries({ queryKey: ['custom-products'] })
      }
    },
    onError: onMutationError,
  })
}

/** Reihenfolge aller Blöcke aktualisieren */
export function useReorderBlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (blocks: { id: string; order_index: number }[]) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<Block[]>(['blocks'], (old) => {
          const byId = new Map((old ?? []).map((b) => [b.id, { ...b }]))
          for (const u of blocks) {
            const row = byId.get(u.id)
            if (row) byId.set(u.id, { ...row, order_index: u.order_index })
          }
          return Array.from(byId.values()).sort((a, b) => a.order_index - b.order_index)
        })
        return
      }

      await Promise.all(
        blocks.map((block) =>
          supabase
            .from('blocks')
            .update(({ order_index: block.order_index } as Database['public']['Tables']['blocks']['Update']) as never)
            .eq('id', block.id)
            .then(({ error }) => { if (error) throw error })
        )
      )
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['blocks'], refetchType: 'all' })
      }
    },
    onError: onMutationError,
  })
}

/** Produkte einer Warengruppe zuweisen (block_id setzen) */
export function useAssignProducts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemIds, blockId }: { itemIds: string[]; blockId: string | null }) => {
      if (isTestModeActive()) {
        const idSet = new Set(itemIds)
        queryClient.setQueriesData<MasterPLUItem[]>({ queryKey: ['plu-items'] }, (old) =>
          old ? old.map((it) => (idSet.has(it.id) ? { ...it, block_id: blockId } : it)) : old,
        )
        return
      }

      const { error } = await supabase
        .from('master_plu_items')
        .update(
        ({ block_id: blockId } as Database['public']['Tables']['master_plu_items']['Update']) as never
      )
        .in('id', itemIds)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['plu-items'], refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: ['blocks'], refetchType: 'all' })
      }
    },
    onError: onMutationError,
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
      if (isTestModeActive()) {
        const fake: BlockRule = {
          id: crypto.randomUUID(),
          block_id: rule.block_id,
          rule_type: rule.rule_type,
          value: rule.value,
          case_sensitive: rule.case_sensitive ?? false,
          modify_name_action: null,
          modify_name_keyword: null,
          created_at: new Date().toISOString(),
        }
        queryClient.setQueryData<BlockRule[]>(['block-rules'], (old) => [...(old ?? []), fake])
        return
      }

      const { error } = await supabase
        .from('block_rules')
        .insert((rule as Database['public']['Tables']['block_rules']['Insert']) as never)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['block-rules'] })
      }
    },
    onError: onMutationError,
  })
}

/** Block-Regel löschen */
export function useDeleteBlockRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<BlockRule[]>(['block-rules'], (old) => (old ?? []).filter((r) => r.id !== id))
        return
      }

      const { error } = await supabase.from('block_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['block-rules'] })
      }
    },
    onError: onMutationError,
  })
}
