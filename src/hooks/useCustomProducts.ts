// Custom Products: Globale eigene Produkte (CRUD)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { CustomProduct } from '@/types/database'

/** Alle globalen Custom Products laden */
export function useCustomProducts() {
  return useQuery({
    queryKey: ['custom-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_products')
        .select('*')
        .order('name')

      if (error) throw error
      return (data ?? []) as CustomProduct[]
    },
  })
}

/** Neues Custom Product hinzufügen */
export function useAddCustomProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (product: {
      plu: string
      name: string
      item_type: 'PIECE' | 'WEIGHT'
      preis?: number | null
      block_id?: string | null
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')

      const { data, error } = await supabase
        .from('custom_products')
        .insert({
          plu: product.plu,
          name: product.name,
          item_type: product.item_type,
          preis: product.preis ?? null,
          block_id: product.block_id ?? null,
          created_by: user.id,
        } as never)
        .select()
        .single()

      if (error) throw error
      return data as CustomProduct
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-products'] })
      toast.success('Eigenes Produkt hinzugefügt')
    },
    onError: (_error) => {
      // Fehler wird von CustomProductDialog als Popup angezeigt
    },
  })
}

/** Mehrere Custom Products auf einmal hinzufügen (z.B. nach Excel-Upload) */
export function useAddCustomProductsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

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
      if (products.length === 0) return []

      const rows = products.map((p) => ({
        plu: p.plu,
        name: p.name,
        item_type: p.item_type,
        preis: p.preis ?? null,
        block_id: p.block_id ?? null,
        created_by: user.id,
      }))

      const { data, error } = await supabase
        .from('custom_products')
        .insert(rows as never)
        .select()

      if (error) throw error
      return (data ?? []) as CustomProduct[]
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-products'] })
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
      const { error } = await supabase
        .from('custom_products')
        .update(updates as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-products'] })
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-products'] })
      toast.success('Eigenes Produkt gelöscht')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Master-Produkt umbenennen (nur Super-Admin) – setzt is_manually_renamed = true */
export function useRenameMasterProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, displayName }: { id: string; displayName: string }) => {
      const { error } = await supabase
        .from('master_plu_items')
        .update({
          display_name: displayName,
          is_manually_renamed: true,
        } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
      toast.success('Produktname geändert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Master-Produkt-Name zurücksetzen (nur Super-Admin) */
export function useResetProductName() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, systemName }: { id: string; systemName: string }) => {
      const { error } = await supabase
        .from('master_plu_items')
        .update({
          display_name: systemName,
          is_manually_renamed: false,
        } as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plu-items'] })
      toast.success('Produktname zurückgesetzt')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
