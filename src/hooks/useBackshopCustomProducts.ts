// Backshop Custom Products: Eigene Produkte Backshop (Bild Pflicht)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import type { BackshopCustomProduct, Database } from '@/types/database'

/** Alle Backshop-Custom-Products laden */
export function useBackshopCustomProducts() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-custom-products', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const data = await queryRest<BackshopCustomProduct[]>('backshop_custom_products', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'name.asc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}

/** Neues Backshop-Custom-Product hinzufügen (image_url Pflicht) */
export function useAddBackshopCustomProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (product: {
      plu: string
      name: string
      image_url: string
      block_id?: string | null
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const fake: BackshopCustomProduct = {
          id: crypto.randomUUID(),
          plu: product.plu,
          name: product.name,
          image_url: product.image_url,
          block_id: product.block_id ?? null,
          created_by: user.id,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
        } as BackshopCustomProduct
        queryClient.setQueryData<BackshopCustomProduct[]>(
          ['backshop-custom-products', currentStoreId],
          (old) => [...(old ?? []), fake],
        )
        return fake
      }

      const insertRow: Database['public']['Tables']['backshop_custom_products']['Insert'] = {
        plu: product.plu,
        name: product.name,
        image_url: product.image_url,
        block_id: product.block_id ?? null,
        created_by: user.id,
        store_id: currentStoreId,
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
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-custom-products', currentStoreId] })
      }
      toast.success('Eigenes Produkt (Backshop) hinzugefügt')
    },
  })
}

/** Backshop-Custom-Product aktualisieren (Name, optional image_url) */
export function useUpdateBackshopCustomProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

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
      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopCustomProduct[]>(
          ['backshop-custom-products', currentStoreId],
          (old) => (old ?? []).map((p) => p.id === id ? { ...p, ...updates } : p),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_custom_products')
        .update(updates as never)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-custom-products', currentStoreId] })
      }
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
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopCustomProduct[]>(
          ['backshop-custom-products', currentStoreId],
          (old) => (old ?? []).filter((p) => p.id !== id),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_custom_products')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-custom-products', currentStoreId] })
      }
      toast.success('Eigenes Produkt (Backshop) gelöscht')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
