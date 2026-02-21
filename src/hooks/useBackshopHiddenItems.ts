// Backshop Hidden Items: Ausgeblendete PLUs (Backshop)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { BackshopHiddenItem, Database } from '@/types/database'

/** Alle ausgeblendeten Backshop-PLUs laden */
export function useBackshopHiddenItems() {
  return useQuery({
    queryKey: ['backshop-hidden-items'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_hidden_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as BackshopHiddenItem[]
    },
  })
}

/** Backshop-PLU ausblenden */
export function useBackshopHideProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!user) throw new Error('Nicht eingeloggt')

      const { error } = await supabase.from('backshop_hidden_items').insert(
        ({ plu, hidden_by: user.id } as Database['public']['Tables']['backshop_hidden_items']['Insert']) as never,
      )

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-hidden-items'] })
      const prev = queryClient.getQueryData<BackshopHiddenItem[]>(['backshop-hidden-items'])
      queryClient.setQueryData<BackshopHiddenItem[]>(['backshop-hidden-items'], (old = []) => {
        if (old.some((h) => h.plu === plu)) return old
        return [
          ...old,
          {
            id: `opt-${plu}`,
            plu,
            hidden_by: user?.id ?? '',
            created_at: new Date().toISOString(),
          } as BackshopHiddenItem,
        ]
      })
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-hidden-items'], ctx.prev)
      if ((err as { code?: string })?.code === '23505') return
      toast.error(`Fehler beim Ausblenden: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-hidden-items'] })
    },
  })
}

/** Backshop-PLU wieder einblenden */
export function useBackshopUnhideProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plu: string) => {
      const { error } = await supabase
        .from('backshop_hidden_items')
        .delete()
        .eq('plu', plu)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-hidden-items'] })
      const prev = queryClient.getQueryData<BackshopHiddenItem[]>(['backshop-hidden-items'])
      queryClient.setQueryData<BackshopHiddenItem[]>(['backshop-hidden-items'], (old = []) =>
        old.filter((h) => h.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-hidden-items'], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Produkt wieder eingeblendet')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-hidden-items'] })
    },
  })
}
