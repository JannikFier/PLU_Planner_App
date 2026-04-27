// Hidden Items: Globale ausgeblendete PLUs (CRUD)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
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
      const data = await queryRest<HiddenItem[]>('hidden_items', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'created_at.desc',
      })
      return data ?? []
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
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      const { error } = await supabase
        .from('hidden_items')
        .insert(
        ({ plu, hidden_by: user.id, store_id: currentStoreId } as Database['public']['Tables']['hidden_items']['Insert']) as never
      )

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items', currentStoreId])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items', currentStoreId], (old = []) => {
        if (old.some((h) => h.plu === plu)) return old
        return [...old, { id: `opt-${plu}`, plu, hidden_by: user?.id ?? '', store_id: currentStoreId, created_at: new Date().toISOString() } as HiddenItem]
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
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')

      if (isTestModeActive()) {
        const existing = queryClient.getQueryData<HiddenItem[]>(['hidden-items', currentStoreId]) ?? []
        const existingSet = new Set(existing.map((h) => h.plu))
        const newItems = plus.filter((p) => !existingSet.has(p)).map((plu) => ({
          id: crypto.randomUUID(),
          plu,
          hidden_by: user.id,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
        } as HiddenItem))
        queryClient.setQueryData<HiddenItem[]>(
          ['hidden-items', currentStoreId],
          [...existing, ...newItems],
        )
        return { added: newItems.length, skipped: plus.length - newItems.length }
      }

      const allRows = plus.map((plu) => ({
        plu,
        hidden_by: user.id,
        store_id: currentStoreId,
      } as Database['public']['Tables']['hidden_items']['Insert']))

      const { error } = await supabase.from('hidden_items').insert(allRows as never[])
      if (error) {
        if ((error as { code?: string }).code === '23505') {
          return { added: 0, skipped: allRows.length }
        }
        throw error
      }
      return { added: allRows.length, skipped: 0 }
    },
    onSuccess: (result) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
      }
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

export type UnhideProductInput = string | { plu: string; silentToast?: boolean }

function normalizeUnhideProductInput(input: UnhideProductInput): { plu: string; silentToast: boolean } {
  if (typeof input === 'string') return { plu: input, silentToast: false }
  return { plu: input.plu, silentToast: Boolean(input.silentToast) }
}

/** PLU wieder einblenden (delete from hidden_items) – mit Optimistic Update */
export function useUnhideProduct() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (input: UnhideProductInput) => {
      const { plu } = normalizeUnhideProductInput(input)
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .eq('plu', plu)
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onMutate: async (input) => {
      const { plu } = normalizeUnhideProductInput(input)
      await queryClient.cancelQueries({ queryKey: ['hidden-items', currentStoreId] })
      const prev = queryClient.getQueryData<HiddenItem[]>(['hidden-items', currentStoreId])
      queryClient.setQueryData<HiddenItem[]>(['hidden-items', currentStoreId], (old = []) =>
        old.filter((h) => h.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _input, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['hidden-items', currentStoreId], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: (_data, input) => {
      const { silentToast } = normalizeUnhideProductInput(input)
      if (!silentToast) toast.success('Produkt wieder eingeblendet')
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
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) {
        queryClient.setQueryData<HiddenItem[]>(['hidden-items', currentStoreId], [])
        return
      }

      const { error } = await supabase
        .from('hidden_items')
        .delete()
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['hidden-items', currentStoreId] })
      }
      toast.success('Alle Produkte wieder eingeblendet')
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`)
    },
  })
}
