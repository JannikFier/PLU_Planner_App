// Backshop Hidden Items: Ausgeblendete PLUs (Backshop)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import type { BackshopHiddenItem, Database } from '@/types/database'

/** Alle ausgeblendeten Backshop-PLUs laden */
export function useBackshopHiddenItems() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-hidden-items', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const data = await queryRest<BackshopHiddenItem[]>('backshop_hidden_items', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'created_at.desc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}

/** Backshop-PLU ausblenden */
export function useBackshopHideProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      const { error } = await supabase.from('backshop_hidden_items').insert(
        ({ plu, hidden_by: user.id, store_id: currentStoreId } as Database['public']['Tables']['backshop_hidden_items']['Insert']) as never,
      )

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<BackshopHiddenItem[]>(['backshop-hidden-items', currentStoreId])
      queryClient.setQueryData<BackshopHiddenItem[]>(['backshop-hidden-items', currentStoreId], (old = []) => {
        if (old.some((h) => h.plu === plu)) return old
        return [
          ...old,
          {
            id: `opt-${plu}`,
            plu,
            hidden_by: user?.id ?? '',
            store_id: currentStoreId,
            created_at: new Date().toISOString(),
          } as BackshopHiddenItem,
        ]
      })
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-hidden-items', currentStoreId], ctx.prev)
      if ((err as { code?: string })?.code === '23505') return
      toast.error(`Fehler beim Ausblenden: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-hidden-items', currentStoreId] })
    },
  })
}

/** Backshop-PLU wieder einblenden */
export function useBackshopUnhideProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      const { error } = await supabase
        .from('backshop_hidden_items')
        .delete()
        .eq('plu', plu)
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<BackshopHiddenItem[]>(['backshop-hidden-items', currentStoreId])
      queryClient.setQueryData<BackshopHiddenItem[]>(['backshop-hidden-items', currentStoreId], (old = []) =>
        old.filter((h) => h.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-hidden-items', currentStoreId], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Produkt wieder eingeblendet')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-hidden-items', currentStoreId] })
    },
  })
}
