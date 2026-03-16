// Hidden Items: Globale ausgeblendete PLUs (CRUD)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import type { Database, HiddenItem } from '@/types/database'

/** Alle ausgeblendeten PLUs laden */
export function useHiddenItems() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['hidden-items', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hidden_items')
        .select('*')
        .eq('store_id', currentStoreId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as HiddenItem[]
    },
    enabled: !!currentStoreId,
  })
}

/** PLU ausblenden (insert in hidden_items) – mit Optimistic Update */
export function useHideProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!user) throw new Error('Nicht eingeloggt')

      const { error } = await supabase
        .from('hidden_items')
        .insert(
        ({ plu, hidden_by: user.id, store_id: currentStoreId! } as Database['public']['Tables']['hidden_items']['Insert']) as never
      )

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items', currentStoreId])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items', currentStoreId], (old = []) => {
        if (old.some((h) => h.plu === plu)) return old
        return [...old, { id: `opt-${plu}`, plu, hidden_by: user?.id ?? '', created_at: new Date().toISOString() } as HiddenItem]
      })
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['hidden-items', currentStoreId], ctx.prev)
      if ((err as { code?: string })?.code === '23505') return
      toast.error(`Fehler beim Ausblenden: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
    },
  })
}

/** Mehrere PLUs batchweise ausblenden (z.B. nach Excel-Upload) */
export function useHideProductsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plus: string[]) => {
      if (!user) throw new Error('Nicht eingeloggt')
      let added = 0
      let skipped = 0
      for (const plu of plus) {
        const { error } = await supabase
          .from('hidden_items')
          .insert(
            ({ plu, hidden_by: user.id, store_id: currentStoreId! } as Database['public']['Tables']['hidden_items']['Insert']) as never
          )
        if (error) {
          if ((error as { code?: string }).code === '23505') skipped++
          else throw error
        } else {
          added++
        }
      }
      return { added, skipped }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
      if (result.added > 0) {
        toast.success(`${result.added} Produkt${result.added === 1 ? '' : 'e'} ausgeblendet`)
      }
      if (result.skipped > 0) {
        toast.info(`${result.skipped} bereits ausgeblendet`)
      }
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}

/** PLU wieder einblenden (delete from hidden_items) – mit Optimistic Update */
export function useUnhideProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plu: string) => {
      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .eq('plu', plu)
        .eq('store_id', currentStoreId!)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items', currentStoreId])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items', currentStoreId], (old = []) =>
        old.filter((h) => h.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['hidden-items', currentStoreId], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Produkt wieder eingeblendet')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
    },
  })
}

/** Alle Produkte wieder einblenden */
export function useUnhideAll() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .eq('store_id', currentStoreId!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
      toast.success('Alle Produkte wieder eingeblendet')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
