// Hidden Items: Globale ausgeblendete PLUs (CRUD)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import type { HiddenItem } from '@/types/database'

/** Alle ausgeblendeten PLUs laden */
export function useHiddenItems() {
  return useQuery({
    queryKey: ['hidden-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hidden_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as HiddenItem[]
    },
  })
}

/** PLU ausblenden (insert in hidden_items) – mit Optimistic Update */
export function useHideProduct() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!user) throw new Error('Nicht eingeloggt')

      const { error } = await supabase
        .from('hidden_items')
        .insert({ plu, hidden_by: user.id } as never)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['hidden-items'] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items'])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items'], (old = []) => {
        if (old.some((h) => h.plu === plu)) return old
        return [...old, { id: `opt-${plu}`, plu, hidden_by: user?.id ?? '', created_at: new Date().toISOString() } as HiddenItem]
      })
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['hidden-items'], ctx.prev)
      if ((err as { code?: string })?.code === '23505') return
      toast.error(`Fehler beim Ausblenden: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items'] })
    },
  })
}

/** Mehrere PLUs batchweise ausblenden (z.B. nach Excel-Upload) */
export function useHideProductsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (plus: string[]) => {
      if (!user) throw new Error('Nicht eingeloggt')
      let added = 0
      let skipped = 0
      for (const plu of plus) {
        const { error } = await supabase
          .from('hidden_items')
          .insert({ plu, hidden_by: user.id } as never)
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
      queryClient.invalidateQueries({ queryKey: ['hidden-items'] })
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

  return useMutation({
    mutationFn: async (plu: string) => {
      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .eq('plu', plu)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['hidden-items'] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items'])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items'], (old = []) =>
        old.filter((h) => h.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['hidden-items'], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Produkt wieder eingeblendet')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items'] })
    },
  })
}

/** Alle Produkte wieder einblenden */
export function useUnhideAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Alle hidden_items löschen
      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Supabase braucht eine Bedingung bei delete

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hidden-items'] })
      toast.success('Alle Produkte wieder eingeblendet')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
