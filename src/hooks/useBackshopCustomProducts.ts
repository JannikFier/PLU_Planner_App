// Backshop Custom Products: Eigene Produkte Backshop (Bild Pflicht)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { BackshopCustomProduct, Database } from '@/types/database'

/** Alle Backshop-Custom-Products laden */
export function useBackshopCustomProducts() {
  return useQuery({
    queryKey: ['backshop-custom-products'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_custom_products')
        .select('*')
        .order('name')

      if (error) throw error
      return (data ?? []) as BackshopCustomProduct[]
    },
  })
}

/** Neues Backshop-Custom-Product hinzufügen (image_url Pflicht) */
export function useAddBackshopCustomProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (product: {
      plu: string
      name: string
      image_url: string
      block_id?: string | null
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')

      const insertRow: Database['public']['Tables']['backshop_custom_products']['Insert'] = {
        plu: product.plu,
        name: product.name,
        image_url: product.image_url,
        block_id: product.block_id ?? null,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('backshop_custom_products')
        .insert(insertRow as never)
        .select()
        .single()

      if (error) throw error
      return data as BackshopCustomProduct
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-custom-products'] })
      toast.success('Eigenes Produkt (Backshop) hinzugefügt')
    },
  })
}

/** Backshop-Custom-Product aktualisieren (Name, optional image_url) */
export function useUpdateBackshopCustomProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      image_url?: string
      block_id?: string | null
    }) => {
      const { error } = await supabase
        .from('backshop_custom_products')
        .update(updates as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-custom-products'] })
      toast.success('Produkt aktualisiert')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** Backshop-Custom-Product löschen */
export function useDeleteBackshopCustomProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backshop_custom_products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-custom-products'] })
      toast.success('Eigenes Produkt (Backshop) gelöscht')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
