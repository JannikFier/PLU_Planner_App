// Zentrale Werbung: Kampagnen + Zeilen + Markt-Opt-out (Obst + Backshop)

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { addWeeks } from 'date-fns'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { formatError } from '@/lib/error-messages'
import { toast } from 'sonner'
import type {
  ObstOfferCampaign,
  ObstOfferCampaignLine,
  ObstOfferStoreDisabled,
  BackshopOfferCampaign,
  BackshopOfferCampaignLine,
  BackshopOfferStoreDisabled,
} from '@/types/database'
import {
  normalizeStoreDisabledPluSet,
  obstCentralKindPriority,
  type CampaignLineRow,
  type CampaignWithLines,
  type ObstCentralCampaignKind,
} from '@/lib/offer-display'

export type SaveCampaignLineInput = {
  plu: string
  promo_price: number
  source_art_nr?: string | null
}

/**
 * Lädt Kampagne für aktuelle ISO-KW; falls keine, für die nächste KW (Vorbereitung: Upload oft für „kommende Woche“).
 * Backshop: genau eine Kampagne pro KW.
 */
async function fetchCampaignWithLines(
  table: 'backshop_offer_campaigns',
  linesTable: 'backshop_offer_campaign_lines',
): Promise<CampaignWithLines | null> {
  const now = new Date()
  const cur = getKWAndYearFromDate(now)
  const next = getKWAndYearFromDate(addWeeks(now, 1))

  for (const slot of [cur, next]) {
    const campaigns = await queryRest<BackshopOfferCampaign[]>(table, {
      select: 'id,kw_nummer,jahr',
      kw_nummer: `eq.${slot.kw}`,
      jahr: `eq.${slot.year}`,
    })
    const c = campaigns?.[0]
    if (!c) continue
    const lines = await queryRest<BackshopOfferCampaignLine[]>(linesTable, {
      select: 'plu,promo_price',
      campaign_id: `eq.${c.id}`,
      order: 'sort_index.asc',
    })
    return {
      kw_nummer: c.kw_nummer,
      jahr: c.jahr,
      lines: (lines ?? []).map((l) => ({ plu: l.plu, promo_price: Number(l.promo_price) })),
    }
  }
  return null
}

/** Obst: bis zu drei Kampagnen (exit, ordersatz_week, ordersatz_3day) pro KW mergen. */
async function fetchObstCampaignsMerged(): Promise<CampaignWithLines | null> {
  const now = new Date()
  const cur = getKWAndYearFromDate(now)
  const next = getKWAndYearFromDate(addWeeks(now, 1))

  for (const slot of [cur, next]) {
    const campaigns = await queryRest<ObstOfferCampaign[]>(`obst_offer_campaigns`, {
      select: 'id,kw_nummer,jahr,campaign_kind',
      kw_nummer: `eq.${slot.kw}`,
      jahr: `eq.${slot.year}`,
    })
    if (!campaigns?.length) continue

    const raw: Array<{
      plu: string
      promo_price: number
      kind: ObstCentralCampaignKind
    }> = []

    for (const c of campaigns) {
      const kind = c.campaign_kind as ObstCentralCampaignKind
      const lines = await queryRest<ObstOfferCampaignLine[]>(`obst_offer_campaign_lines`, {
        select: 'plu,promo_price',
        campaign_id: `eq.${c.id}`,
        order: 'sort_index.asc',
      })
      for (const l of lines ?? []) {
        raw.push({
          plu: l.plu,
          promo_price: Number(l.promo_price),
          kind,
        })
      }
    }

    const allCentralPluUnion = [...new Set(raw.map((r) => r.plu))]

    const bestByPlu = new Map<string, { plu: string; promo_price: number; central_kind: ObstCentralCampaignKind }>()
    for (const row of raw) {
      const prev = bestByPlu.get(row.plu)
      if (
        !prev ||
        obstCentralKindPriority(row.kind) > obstCentralKindPriority(prev.central_kind)
      ) {
        bestByPlu.set(row.plu, {
          plu: row.plu,
          promo_price: row.promo_price,
          central_kind: row.kind,
        })
      }
    }

    const mergedLines: CampaignLineRow[] = [...bestByPlu.values()].map((r) => ({
      plu: r.plu,
      promo_price: r.promo_price,
      central_kind: r.central_kind,
    }))

    const first = campaigns[0]
    return {
      kw_nummer: first.kw_nummer,
      jahr: first.jahr,
      lines: mergedLines,
      allCentralPluUnion,
    }
  }
  return null
}

/** Aktive Obst-Kampagne(n) inkl. Zeilen (aktuelle KW, sonst nächste KW); Merge mit Duplikat-Priorität */
export function useObstOfferCampaignWithLines() {
  const { kw, year } = getKWAndYearFromDate(new Date())

  return useQuery({
    queryKey: ['obst-offer-campaign', kw, year],
    staleTime: 60_000,
    queryFn: async (): Promise<CampaignWithLines | null> => {
      return fetchObstCampaignsMerged()
    },
  })
}

/** PLUs für die der Markt die zentrale Werbung ausgeblendet hat (Megafon aus) */
export function useObstOfferStoreDisabled() {
  const { currentStoreId } = useCurrentStore()

  const query = useQuery({
    queryKey: ['obst-offer-store-disabled', currentStoreId],
    staleTime: 60_000,
    /** string[] ist JSON-persistierbar; Set würde nach Reload kaputt gehen. */
    queryFn: async (): Promise<string[]> => {
      if (!currentStoreId) return []
      const rows = await queryRest<ObstOfferStoreDisabled[]>('obst_offer_store_disabled', {
        select: 'plu',
        store_id: `eq.${currentStoreId}`,
      })
      return (rows ?? []).map((r) => r.plu)
    },
    enabled: !!currentStoreId,
  })

  const dataAsSet = useMemo(() => normalizeStoreDisabledPluSet(query.data), [query.data])

  return { ...query, data: dataAsSet }
}

export function useToggleObstOfferDisabled() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({ plu, disabled }: { plu: string; disabled: boolean }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      if (disabled) {
        const { error } = await supabase.from('obst_offer_store_disabled').upsert(
          {
            store_id: currentStoreId,
            plu,
            created_by: user?.id ?? null,
          } as never,
          { onConflict: 'store_id,plu' },
        )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obst_offer_store_disabled')
          .delete()
          .eq('store_id', currentStoreId)
          .eq('plu', plu)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obst-offer-store-disabled', currentStoreId] })
      toast.success('Werbung aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

/** Backshop: zentrale Kampagne + Zeilen (aktuelle KW, sonst nächste KW) */
export function useBackshopOfferCampaignWithLines() {
  const { kw, year } = getKWAndYearFromDate(new Date())

  return useQuery({
    queryKey: ['backshop-offer-campaign', kw, year],
    staleTime: 60_000,
    queryFn: async (): Promise<CampaignWithLines | null> => {
      return fetchCampaignWithLines('backshop_offer_campaigns', 'backshop_offer_campaign_lines')
    },
  })
}

export function useBackshopOfferStoreDisabled() {
  const { currentStoreId } = useCurrentStore()

  const query = useQuery({
    queryKey: ['backshop-offer-store-disabled', currentStoreId],
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!currentStoreId) return []
      const rows = await queryRest<BackshopOfferStoreDisabled[]>('backshop_offer_store_disabled', {
        select: 'plu',
        store_id: `eq.${currentStoreId}`,
      })
      return (rows ?? []).map((r) => r.plu)
    },
    enabled: !!currentStoreId,
  })

  const dataAsSet = useMemo(() => normalizeStoreDisabledPluSet(query.data), [query.data])

  return { ...query, data: dataAsSet }
}

export function useToggleBackshopOfferDisabled() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()

  return useMutation({
    mutationFn: async ({ plu, disabled }: { plu: string; disabled: boolean }) => {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      if (isTestModeActive()) return

      if (disabled) {
        const { error } = await supabase.from('backshop_offer_store_disabled').upsert(
          {
            store_id: currentStoreId,
            plu,
            created_by: user?.id ?? null,
          } as never,
          { onConflict: 'store_id,plu' },
        )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('backshop_offer_store_disabled')
          .delete()
          .eq('store_id', currentStoreId)
          .eq('plu', plu)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-store-disabled', currentStoreId] })
      toast.success('Werbung aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

/** Super-Admin: Obst-Kampagne für KW + Kind ersetzen */
export function useSaveObstOfferCampaign() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: {
      kwNummer: number
      jahr: number
      campaignKind: ObstCentralCampaignKind
      fileName?: string | null
      lines: SaveCampaignLineInput[]
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { error: delErr } = await supabase
        .from('obst_offer_campaigns')
        .delete()
        .eq('kw_nummer', payload.kwNummer)
        .eq('jahr', payload.jahr)
        .eq('campaign_kind', payload.campaignKind)
      if (delErr) throw delErr

      const { data: camp, error: insErr } = await supabase
        .from('obst_offer_campaigns')
        .insert({
          kw_nummer: payload.kwNummer,
          jahr: payload.jahr,
          campaign_kind: payload.campaignKind,
          source_file_name: payload.fileName ?? null,
          created_by: user.id,
        } as never)
        .select('id')
        .single()
      if (insErr) throw insErr
      const campaignId = (camp as { id: string }).id

      if (payload.lines.length === 0) return

      const lineRows = payload.lines.map((l, i) => ({
        campaign_id: campaignId,
        plu: l.plu,
        promo_price: l.promo_price,
        sort_index: i,
        source_art_nr: l.source_art_nr ?? null,
      }))
      const { error: lineErr } = await supabase.from('obst_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaign'] })
      toast.success('Zentrale Werbung (Obst/Gemüse) gespeichert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

/** Super-Admin: Backshop-Kampagne für KW ersetzen */
export function useSaveBackshopOfferCampaign() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (payload: {
      kwNummer: number
      jahr: number
      fileName?: string | null
      lines: SaveCampaignLineInput[]
    }) => {
      if (!user) throw new Error('Nicht eingeloggt')
      const { error: delErr } = await supabase
        .from('backshop_offer_campaigns')
        .delete()
        .eq('kw_nummer', payload.kwNummer)
        .eq('jahr', payload.jahr)
      if (delErr) throw delErr

      const { data: camp, error: insErr } = await supabase
        .from('backshop_offer_campaigns')
        .insert({
          kw_nummer: payload.kwNummer,
          jahr: payload.jahr,
          source_file_name: payload.fileName ?? null,
          created_by: user.id,
        } as never)
        .select('id')
        .single()
      if (insErr) throw insErr
      const campaignId = (camp as { id: string }).id

      if (payload.lines.length === 0) return

      const lineRows = payload.lines.map((l, i) => ({
        campaign_id: campaignId,
        plu: l.plu,
        promo_price: l.promo_price,
        sort_index: i,
        source_art_nr: l.source_art_nr ?? null,
      }))
      const { error: lineErr } = await supabase.from('backshop_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign'] })
      toast.success('Zentrale Werbung (Backshop) gespeichert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}
