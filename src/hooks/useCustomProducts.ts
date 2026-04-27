// Custom Products: Globale eigene Produkte (CRUD)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import type { CustomProduct, Database, MasterPLUItem, RenamedItem } from '@/types/database'

/** Alle globalen Custom Products laden */
export function useCustomProducts() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['custom-products', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const data = await queryRest<CustomProduct[]>('custom_products', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'name.asc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}

/** Neues Custom Product hinzufügen */
export function useAddCustomProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (product: {
      plu: string
      name: string
      item_type: 'PIECE' | 'WEIGHT'
      preis?: number | null
      block_id?: string | null
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const fake: CustomProduct = {
          id: crypto.randomUUID(),
          plu: product.plu,
          name: product.name,
          item_type: product.item_type,
          preis: product.preis ?? null,
          block_id: product.block_id ?? null,
          created_by: user.id,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
        } as CustomProduct

        queryClient.setQueryData<CustomProduct[]>(
          ['custom-products', currentStoreId],
          (old) => [...(old ?? []), fake],
        )
        return fake
      }

      const { data, error } = await supabase
        .from('custom_products')
        .insert(
        ({
          plu: product.plu,
          name: product.name,
          item_type: product.item_type,
          preis: product.preis ?? null,
          block_id: product.block_id ?? null,
          created_by: user.id,
          store_id: currentStoreId,
        } as Database['public']['Tables']['custom_products']['Insert']) as never
      )
        .select()
        .single()

      if (error) throw error
      return data as CustomProduct
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['custom-products', currentStoreId] })
      }
      toast.success('Eigenes Produkt hinzugefügt')
    },
    onError: () => {
      // Fehler wird von CustomProductDialog als Popup angezeigt
    },
  })
}

/** Mehrere Custom Products auf einmal hinzufügen (z.B. nach Excel-Upload) */
export function useAddCustomProductsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (
      products: Array<{
        plu: string
        name: string
        item_type: 'PIECE' | 'WEIGHT'
        preis?: number | null
        block_id?: string | null
      }>,
    ) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (products.length === 0) return []

      if (isTestModeActive()) {
        const fakes = products.map((p) => ({
          id: crypto.randomUUID(),
          plu: p.plu,
          name: p.name,
          item_type: p.item_type,
          preis: p.preis ?? null,
          block_id: p.block_id ?? null,
          created_by: user.id,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
        } as CustomProduct))
        queryClient.setQueryData<CustomProduct[]>(
          ['custom-products', currentStoreId],
          (old) => [...(old ?? []), ...fakes],
        )
        return fakes
      }

      const rows = products.map((p) => ({
        plu: p.plu,
        name: p.name,
        item_type: p.item_type,
        preis: p.preis ?? null,
        block_id: p.block_id ?? null,
        created_by: user.id,
        store_id: currentStoreId,
      }))

      const { data, error } = await supabase
        .from('custom_products')
        .insert((rows as Database['public']['Tables']['custom_products']['Insert'][]) as never)
        .select()

      if (error) throw error
      return (data ?? []) as CustomProduct[]
    },
    onSuccess: (data) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['custom-products', currentStoreId] })
      }
      const count = data.length
      toast.success(`${count} Produkt${count === 1 ? '' : 'e'} hinzugefügt`)
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Custom Product aktualisieren (Name, Preis, Block) */
export function useUpdateCustomProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      preis?: number | null
      block_id?: string | null
      item_type?: 'PIECE' | 'WEIGHT'
    }) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<CustomProduct[]>(
          ['custom-products', currentStoreId],
          (old) => (old ?? []).map((p) => p.id === id ? { ...p, ...updates } : p),
        )
        return
      }

      const { error } = await supabase
        .from('custom_products')
        .update((updates as Database['public']['Tables']['custom_products']['Update']) as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['custom-products', currentStoreId] })
      }
      toast.success('Produkt aktualisiert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Custom Product löschen */
export function useDeleteCustomProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<CustomProduct[]>(
          ['custom-products', currentStoreId],
          (old) => (old ?? []).filter((p) => p.id !== id),
        )
        return
      }

      const { error } = await supabase
        .from('custom_products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['custom-products', currentStoreId] })
      }
      toast.success('Eigenes Produkt gelöscht')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Master-Produkt umbenennen (Admin + Super-Admin) – per RPC, setzt is_manually_renamed = true */
export function useRenameMasterProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, displayName }: { id: string; displayName: string }) => {
      if (isTestModeActive()) {
        queryClient.setQueriesData<MasterPLUItem[]>(
          { queryKey: ['plu-items'] },
          (old) => (old ?? []).map((item) =>
            item.id === id ? { ...item, display_name: displayName, is_manually_renamed: true } : item,
          ),
        )
        return
      }

      const { error } = await supabase.rpc('rename_master_plu_item', {
        item_id: id,
        new_display_name: displayName,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['renamed-items'] })
      }
      toast.success('Produktname geändert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Master-Produkt-Name zurücksetzen (Admin + Super-Admin) – per RPC */
export function useResetProductName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, systemName }: { id: string; systemName: string }) => {
      if (isTestModeActive()) {
        queryClient.setQueriesData<MasterPLUItem[]>(
          { queryKey: ['plu-items'] },
          (old) => (old ?? []).map((item) =>
            item.id === id ? { ...item, display_name: systemName, is_manually_renamed: false } : item,
          ),
        )
        return
      }

      const { error } = await supabase.rpc('reset_master_plu_item_display_name', {
        item_id: id,
        system_name: systemName,
      } as never)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['plu-items'] })
        queryClient.invalidateQueries({ queryKey: ['renamed-items'] })
      }
      toast.success('Produktname zurückgesetzt')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Nur-Carryover-Zeilen: kein master_plu_items.id – Umbenennung direkt in renamed_items. */
export function useUpsertObstRenamedByPlu() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({
      plu,
      displayName,
      systemName,
    }: {
      plu: string
      displayName: string
      systemName: string
    }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const trimmed = displayName.trim()
      const isManual = trimmed !== systemName.trim()
      if (isTestModeActive()) {
        queryClient.setQueriesData<RenamedItem[]>(
          { queryKey: ['renamed-items', currentStoreId] },
          (old) => {
            const list = [...(old ?? [])]
            const idx = list.findIndex((r) => r.plu === plu)
            const base: RenamedItem = {
              id: idx >= 0 ? list[idx].id : `test-${plu}`,
              plu,
              store_id: currentStoreId,
              display_name: trimmed,
              is_manually_renamed: isManual,
              created_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            if (idx >= 0) list[idx] = { ...list[idx], ...base }
            else list.push(base)
            return list
          },
        )
        return
      }

      const { error } = await supabase.from('renamed_items').upsert(
        {
          plu,
          store_id: currentStoreId,
          display_name: trimmed,
          is_manually_renamed: isManual,
        } as never,
        { onConflict: 'plu,store_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['renamed-items'] })
      }
      toast.success('Produktname geändert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

export function useDeleteObstRenamedByPlu() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({ plu }: { plu: string }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) {
        queryClient.setQueriesData<RenamedItem[]>(
          { queryKey: ['renamed-items', currentStoreId] },
          (old) => (old ?? []).filter((r) => r.plu !== plu),
        )
        return
      }
      const { error } = await supabase
        .from('renamed_items')
        .delete()
        .eq('plu', plu)
        .eq('store_id', currentStoreId)
      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['renamed-items'] })
      }
      toast.success('Produktname zurückgesetzt')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
