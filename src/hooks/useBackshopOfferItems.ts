// Backshop Offer Items (Werbung/Angebot): CRUD + Batch

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import type { BackshopOfferItem, Database } from '@/types/database'

/** Alle Backshop-Werbung/Angebot-Einträge laden */
export function useBackshopOfferItems() {
  return useQuery({
    queryKey: ['backshop-offer-items'],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backshop_offer_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as BackshopOfferItem[]
    },
  })
}

/** Backshop-Produkt zur Werbung hinzufügen */
export function useBackshopAddOfferItem() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ plu, durationWeeks }: { plu: string; durationWeeks: number }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { kw, year } = getKWAndYearFromDate(new Date())

      const row: Database['public']['Tables']['backshop_offer_items']['Insert'] = {
        plu,
        start_kw: kw,
        start_jahr: year,
        duration_weeks: Math.max(1, Math.min(4, durationWeeks)),
        created_by: user.id,
      }

      const { error } = await supabase.from('backshop_offer_items').upsert(row as never, {
        onConflict: 'plu',
        ignoreDuplicates: false,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-items'] })
      toast.success('Produkt zur Werbung hinzugefügt')
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}

/** Laufzeit eines Backshop-Werbung-Eintrags ändern (1–4 Wochen) */
export function useBackshopUpdateOfferItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ plu, durationWeeks }: { plu: string; durationWeeks: number }) => {
      const weeks = Math.max(1, Math.min(4, durationWeeks))
      const { error } = await supabase
        .from('backshop_offer_items')
        .update({ duration_weeks: weeks } as never)
        .eq('plu', plu)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-items'] })
      toast.success('Laufzeit aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
  })
}

/** Backshop-Produkt aus der Werbung entfernen */
export function useBackshopRemoveOfferItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plu: string) => {
      const { error } = await supabase
        .from('backshop_offer_items')
        .delete()
        .eq('plu', plu)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-offer-items'] })
      const prev = queryClient.getQueryData<BackshopOfferItem[]>(['backshop-offer-items'])
      queryClient.setQueryData<BackshopOfferItem[]>(['backshop-offer-items'], (old = []) =>
        old.filter((o) => o.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-offer-items'], ctx.prev)
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    },
    onSuccess: () => {
      toast.success('Aus Werbung entfernt')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-items'] })
    },
  })
}

/** Mehrere Backshop-Produkte zur Werbung hinzufügen (z. B. nach Excel-Import) */
export function useBackshopAddOfferItemsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (rows: { plu: string; durationWeeks: number }[]) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { kw, year } = getKWAndYearFromDate(new Date())
      let added = 0
      let skipped = 0
      for (const { plu, durationWeeks } of rows) {
        const row: Database['public']['Tables']['backshop_offer_items']['Insert'] = {
          plu,
          start_kw: kw,
          start_jahr: year,
          duration_weeks: Math.max(1, Math.min(4, durationWeeks)),
          created_by: user.id,
        }
        const { error } = await supabase.from('backshop_offer_items').upsert(row as never, {
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
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-items'] })
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
