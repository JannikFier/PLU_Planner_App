// Backshop Offer Items (Werbung/Angebot): CRUD + Batch

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { toast } from 'sonner'
import { formatError } from '@/lib/error-messages'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import type { BackshopOfferItem, Database } from '@/types/database'

/** Alle Backshop-Werbung/Angebot-Einträge laden */
export function useBackshopOfferItems() {
  const { currentStoreId } = useCurrentStore()

  return useQuery({
    queryKey: ['backshop-offer-items', currentStoreId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const data = await queryRest<BackshopOfferItem[]>('backshop_offer_items', {
        select: '*',
        store_id: `eq.${currentStoreId}`,
        order: 'created_at.desc',
      })
      return data ?? []
    },
    enabled: !!currentStoreId,
  })
}

/** Backshop-Produkt zur Werbung hinzufügen */
export function useBackshopAddOfferItem() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({
      plu,
      durationWeeks,
      promoPrice,
    }: {
      plu: string
      durationWeeks: number
      promoPrice: number
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { kw, year } = getKWAndYearFromDate(new Date())
      const weeks = Math.max(1, Math.min(4, durationWeeks))
      if (promoPrice <= 0 || Number.isNaN(promoPrice)) {
        throw new Error('Bitte einen gültigen Aktionspreis größer 0 eingeben.')
      }

      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopOfferItem[]>(
          ['backshop-offer-items', currentStoreId],
          (old) => {
            const filtered = (old ?? []).filter((o) => o.plu !== plu)
            return [...filtered, {
              id: crypto.randomUUID(),
              plu,
              start_kw: kw,
              start_jahr: year,
              duration_weeks: weeks,
              created_by: user.id,
              store_id: currentStoreId,
              created_at: new Date().toISOString(),
              promo_price: promoPrice,
              offer_source: 'manual',
            } as BackshopOfferItem]
          },
        )
        return
      }

      const row: Database['public']['Tables']['backshop_offer_items']['Insert'] = {
        plu,
        start_kw: kw,
        start_jahr: year,
        duration_weeks: weeks,
        created_by: user.id,
        store_id: currentStoreId,
        promo_price: promoPrice,
        offer_source: 'manual',
      }

      const { error } = await supabase.from('backshop_offer_items').upsert(row as never, {
        onConflict: 'plu,store_id',
        ignoreDuplicates: false,
      })

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-offer-items', currentStoreId] })
      }
      toast.success('Produkt zur Werbung hinzugefügt')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

/** Laufzeit eines Backshop-Werbung-Eintrags ändern (1–4 Wochen) */
export function useBackshopUpdateOfferItem() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({ plu, durationWeeks }: { plu: string; durationWeeks: number }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const weeks = Math.max(1, Math.min(4, durationWeeks))

      if (isTestModeActive()) {
        queryClient.setQueryData<BackshopOfferItem[]>(
          ['backshop-offer-items', currentStoreId],
          (old) => (old ?? []).map((o) => o.plu === plu ? { ...o, duration_weeks: weeks } : o),
        )
        return
      }

      const { error } = await supabase
        .from('backshop_offer_items')
        .update({ duration_weeks: weeks } as never)
        .eq('plu', plu)
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onSuccess: () => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-offer-items', currentStoreId] })
      }
      toast.success('Laufzeit aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

/** Backshop-Produkt aus der Werbung entfernen */
export function useBackshopRemoveOfferItem() {
  const queryClient = useQueryClient()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (plu: string) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      const { error } = await supabase
        .from('backshop_offer_items')
        .delete()
        .eq('plu', plu)
        .eq('store_id', currentStoreId)

      if (error) throw error
    },
    onMutate: async (plu) => {
      await queryClient.cancelQueries({ queryKey: ['backshop-offer-items', currentStoreId] })
      const prev = queryClient.getQueryData<BackshopOfferItem[]>(['backshop-offer-items', currentStoreId])
      queryClient.setQueryData<BackshopOfferItem[]>(['backshop-offer-items', currentStoreId], (old = []) =>
        old.filter((o) => o.plu !== plu),
      )
      return { prev }
    },
    onError: (err, _plu, ctx) => {
      if (ctx?.prev != null) queryClient.setQueryData(['backshop-offer-items', currentStoreId], ctx.prev)
      toast.error(`Fehler: ${formatError(err)}`)
    },
    onSuccess: () => {
      toast.success('Aus Werbung entfernt')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-items', currentStoreId] })
    },
  })
}

/** Mehrere Backshop-Produkte zur Werbung hinzufügen (z. B. nach Excel-Import) */
export function useBackshopAddOfferItemsBatch() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (rows: { plu: string; durationWeeks: number; promoPrice?: number | null }[]) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      const { kw, year } = getKWAndYearFromDate(new Date())

      if (isTestModeActive()) {
        const existing = queryClient.getQueryData<BackshopOfferItem[]>(['backshop-offer-items', currentStoreId]) ?? []
        const existingSet = new Set(existing.map((o) => o.plu))
        const newItems = rows.filter((r) => !existingSet.has(r.plu)).map((r) => ({
          id: crypto.randomUUID(),
          plu: r.plu,
          start_kw: kw,
          start_jahr: year,
          duration_weeks: Math.max(1, Math.min(4, r.durationWeeks)),
          created_by: user.id,
          store_id: currentStoreId,
          created_at: new Date().toISOString(),
          promo_price: r.promoPrice ?? null,
          offer_source: 'manual',
        } as BackshopOfferItem))
        queryClient.setQueryData<BackshopOfferItem[]>(['backshop-offer-items', currentStoreId], [...existing, ...newItems])
        return { added: newItems.length, skipped: rows.length - newItems.length }
      }

      const allRows = rows.map(({ plu, durationWeeks, promoPrice }) => ({
        plu,
        start_kw: kw,
        start_jahr: year,
        duration_weeks: Math.max(1, Math.min(4, durationWeeks)),
        created_by: user.id,
        store_id: currentStoreId,
        promo_price: promoPrice ?? null,
        offer_source: 'manual' as const,
      } as Database['public']['Tables']['backshop_offer_items']['Insert']))

      const { error } = await supabase.from('backshop_offer_items').upsert(allRows as never[], {
        onConflict: 'plu,store_id',
        ignoreDuplicates: false,
      })
      if (error) throw error
      return { added: allRows.length, skipped: 0 }
    },
    onSuccess: (result) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-offer-items', currentStoreId] })
      }
      if (result.added > 0) {
        toast.success(`${result.added} Produkt${result.added === 1 ? '' : 'e'} zur Werbung hinzugefügt`)
      }
      if (result.skipped > 0) {
        toast.info(`${result.skipped} bereits in der Werbung`)
      }
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}
