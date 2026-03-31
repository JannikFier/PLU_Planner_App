// Lokale Aktionspreise zur zentralen Werbung (nur Anzeige pro Markt)

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { formatError, isPostgrestMissingRelation, MISSING_LOCAL_OFFER_PRICES_TABLES_MSG } from '@/lib/error-messages'
import { toast } from 'sonner'
import type { CampaignWithLines } from '@/lib/offer-display'
import type { ObstOfferStoreLocalPrice, BackshopOfferStoreLocalPrice } from '@/types/database'

function buildOverrideMap(rows: { plu: string; local_promo_price: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    m.set(r.plu, Number(r.local_promo_price))
  }
  return m
}

export function useObstOfferLocalPriceOverrides(campaign: CampaignWithLines | null | undefined) {
  const { currentStoreId } = useCurrentStore()
  const kw = campaign?.kw_nummer
  const jahr = campaign?.jahr

  const q = useQuery({
    queryKey: ['obst-offer-local-prices', currentStoreId, kw, jahr],
    staleTime: 60_000,
    queryFn: async (): Promise<ObstOfferStoreLocalPrice[]> => {
      if (!currentStoreId || kw == null || jahr == null) return []
      const rows = await queryRest<ObstOfferStoreLocalPrice[]>(
        'obst_offer_store_local_prices',
        {
          select: '*',
          store_id: `eq.${currentStoreId}`,
          kw_nummer: `eq.${kw}`,
          jahr: `eq.${jahr}`,
        },
        { onMissingRelation: 'empty' },
      )
      return rows ?? []
    },
    enabled: !!currentStoreId && kw != null && jahr != null,
  })

  const overrideMap = useMemo(() => buildOverrideMap(q.data ?? []), [q.data])

  return { ...q, overrideMap }
}

export function useUpsertObstOfferLocalPrice() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (input: { plu: string; kw_nummer: number; jahr: number; local_promo_price: number }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) {
        return
      }
      const { error } = await supabase.from('obst_offer_store_local_prices').upsert(
        {
          store_id: currentStoreId,
          plu: input.plu,
          kw_nummer: input.kw_nummer,
          jahr: input.jahr,
          local_promo_price: input.local_promo_price,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'store_id,plu,kw_nummer,jahr' },
      )
      if (error) {
        if (isPostgrestMissingRelation(error)) {
          throw new Error(MISSING_LOCAL_OFFER_PRICES_TABLES_MSG)
        }
        throw error
      }
    },
    onSuccess: (_d, v) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['obst-offer-local-prices', currentStoreId, v.kw_nummer, v.jahr] })
      }
      toast.success('Eigener Aktionspreis gespeichert')
    },
    onError: (e) => toast.error(formatError(e)),
  })
}

export function useBackshopOfferLocalPriceOverrides(campaign: CampaignWithLines | null | undefined) {
  const { currentStoreId } = useCurrentStore()
  const kw = campaign?.kw_nummer
  const jahr = campaign?.jahr

  const q = useQuery({
    queryKey: ['backshop-offer-local-prices', currentStoreId, kw, jahr],
    staleTime: 60_000,
    queryFn: async (): Promise<BackshopOfferStoreLocalPrice[]> => {
      if (!currentStoreId || kw == null || jahr == null) return []
      const rows = await queryRest<BackshopOfferStoreLocalPrice[]>(
        'backshop_offer_store_local_prices',
        {
          select: '*',
          store_id: `eq.${currentStoreId}`,
          kw_nummer: `eq.${kw}`,
          jahr: `eq.${jahr}`,
        },
        { onMissingRelation: 'empty' },
      )
      return rows ?? []
    },
    enabled: !!currentStoreId && kw != null && jahr != null,
  })

  const overrideMap = useMemo(() => buildOverrideMap(q.data ?? []), [q.data])

  return { ...q, overrideMap }
}

export function useUpsertBackshopOfferLocalPrice() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async (input: { plu: string; kw_nummer: number; jahr: number; local_promo_price: number }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) {
        return
      }
      const { error } = await supabase.from('backshop_offer_store_local_prices').upsert(
        {
          store_id: currentStoreId,
          plu: input.plu,
          kw_nummer: input.kw_nummer,
          jahr: input.jahr,
          local_promo_price: input.local_promo_price,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'store_id,plu,kw_nummer,jahr' },
      )
      if (error) {
        if (isPostgrestMissingRelation(error)) {
          throw new Error(MISSING_LOCAL_OFFER_PRICES_TABLES_MSG)
        }
        throw error
      }
    },
    onSuccess: (_d, v) => {
      if (!isTestModeActive()) {
        queryClient.invalidateQueries({ queryKey: ['backshop-offer-local-prices', currentStoreId, v.kw_nummer, v.jahr] })
      }
      toast.success('Eigener Aktionspreis gespeichert')
    },
    onError: (e) => toast.error(formatError(e)),
  })
}
