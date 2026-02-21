// Offer Items (Werbung/Angebot): Obst/Gemüse – CRUD + Batch

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import type { Database, OfferItem } from '@/types/database'

/** Alle Werbung/Angebot-Einträge laden */
export function useOfferItems() {
  return useQuery({
    queryKey: ['offer-items'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plu_offer_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as OfferItem[]
    },
  })
}

/** Ein Produkt zur Werbung hinzufügen (1–4 Wochen, Start = aktuelle KW) */
export function useAddOfferItem() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ plu, durationWeeks }: { plu: string; durationWeeks: number }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { kw, year } = getKWAndYearFromDate(new Date())

      const row: Database['public']['Tables']['plu_offer_items']['Insert'] = {
        plu,
        start_kw: kw,
        start_jahr: year,
        duration_weeks: Math.max(1, Math.min(4, durationWeeks)),
        created_by: user.id,
      }

      const { error } = await supabase.from('plu_offer_items').upsert(row as never, {
        onConflict: 'plu',
        ignoreDuplicates: false,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-items'] })
      toast.success('Produkt zur Werbung hinzugefügt')
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}

/** Laufzeit eines Werbung-Eintrags ändern (1–4 Wochen) */
export function useUpdateOfferItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plu, durationWeeks }: { plu: string; durationWeeks: number }) => {
      const weeks = Math.max(1, Math.min(4, durationWeeks))
      const { error } = await supabase
        .from('plu_offer_items')
        .update({ duration_weeks: weeks } as never)
        .eq('plu', plu)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-items'] })
      toast.success('Laufzeit aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}

/** Produkt aus der Werbung entfernen */
export function useRemoveOfferItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plu: string) => {
      const { error } = await supabase
        .from('plu_offer_items')
        .delete()
        .eq('plu', plu)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['offer-items'] })
      const prev = queryClient.getQueryData<OfferItem[]>(['offer-items'])
      queryClient.setQueryData<OfferItem[]>(['offer-items'], (old = []) =>
        old.filter((o) => o.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['offer-items'], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Aus Werbung entfernt')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-items'] })
    },
  })
}

/** Mehrere Produkte zur Werbung hinzufügen (z. B. nach Excel-Import) */
export function useAddOfferItemsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (rows: { plu: string; durationWeeks: number }[]) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { kw, year } = getKWAndYearFromDate(new Date())
      let added = 0
      let skipped = 0
      for (const { plu, durationWeeks } of rows) {
        const row: Database['public']['Tables']['plu_offer_items']['Insert'] = {
          plu,
          start_kw: kw,
          start_jahr: year,
          duration_weeks: Math.max(1, Math.min(4, durationWeeks)),
          created_by: user.id,
        }
        const { error } = await supabase.from('plu_offer_items').upsert(row as never, {
          onConflict: 'plu',
          ignoreDuplicates: false,
        })
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
      queryClient.invalidateQueries({ queryKey: ['offer-items'] })
      if (result.added > 0) {
        toast.success(`${result.added} Produkt${result.added === 1 ? '' : 'e'} zur Werbung hinzugefügt`)
      }
      if (result.skipped > 0) {
        toast.info(`${result.skipped} bereits in der Werbung`)
      }
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}
