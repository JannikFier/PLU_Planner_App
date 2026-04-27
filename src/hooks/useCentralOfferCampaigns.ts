// Zentrale Werbung: Kampagnen + Zeilen + Markt-Opt-out (Obst + Backshop)

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, queryRest, isTestModeActive } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { addWeeks } from 'date-fns'
import {
  getBackshopWerbungAnchorDate,
  getBackshopWerbungKwYearFromDate,
  getKWAndYearFromDate,
} from '@/lib/date-kw-utils'
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
  /** null = "keine Zuordnung" (origin muss dann 'unassigned' sein) */
  plu: string | null
  promo_price: number
  source_art_nr?: string | null
  source_plu?: string | null
  source_artikel?: string | null
  origin?: 'excel' | 'manual' | 'unassigned'
}

/** Backshop: genau eine Kampagne pro KW/Jahr – Zeilen für Anzeige (ohne unassigned). */
async function fetchBackshopCampaignWithLinesForKwYear(
  kw: number,
  jahr: number,
): Promise<CampaignWithLines | null> {
  const campaigns = await queryRest<BackshopOfferCampaign[]>('backshop_offer_campaigns', {
    select: 'id,kw_nummer,jahr',
    kw_nummer: `eq.${kw}`,
    jahr: `eq.${jahr}`,
  })
  const c = campaigns?.[0]
  if (!c) return null
  const lines = await queryRest<BackshopOfferCampaignLine[]>('backshop_offer_campaign_lines', {
    select: 'plu,promo_price,origin',
    campaign_id: `eq.${c.id}`,
    order: 'sort_index.asc',
  })
  return {
    kw_nummer: c.kw_nummer,
    jahr: c.jahr,
    lines: (lines ?? [])
      .filter((l) => l.plu != null && l.origin !== 'unassigned')
      .map((l) => ({ plu: l.plu as string, promo_price: Number(l.promo_price) })),
  }
}

/**
 * Lädt Kampagne für aktuelle ISO-KW; falls keine, für die nächste KW (Vorbereitung: Upload oft für „kommende Woche“).
 * Backshop: genau eine Kampagne pro KW.
 */
async function fetchBackshopCampaignWithLinesAuto(): Promise<CampaignWithLines | null> {
  const now = new Date()
  const anchorDate = getBackshopWerbungAnchorDate(now)
  const cur = getKWAndYearFromDate(anchorDate)
  const next = getKWAndYearFromDate(addWeeks(anchorDate, 1))

  for (const slot of [cur, next]) {
    const c = await fetchBackshopCampaignWithLinesForKwYear(slot.kw, slot.year)
    if (c) return c
  }
  return null
}

/** Obst: bis zu drei Kampagnen (exit, ordersatz_week, ordersatz_3day) für genau eine KW mergen. */
export async function fetchObstCampaignsMergedForKwYear(
  kw: number,
  jahr: number,
): Promise<CampaignWithLines | null> {
  const campaigns = await queryRest<ObstOfferCampaign[]>(`obst_offer_campaigns`, {
    select: 'id,kw_nummer,jahr,campaign_kind',
    kw_nummer: `eq.${kw}`,
    jahr: `eq.${jahr}`,
  })
  if (!campaigns?.length) return null

  const raw: Array<{
    plu: string
    promo_price: number
    kind: ObstCentralCampaignKind
  }> = []

  for (const c of campaigns) {
    const kind = c.campaign_kind as ObstCentralCampaignKind
    const lines = await queryRest<ObstOfferCampaignLine[]>(`obst_offer_campaign_lines`, {
      select: 'plu,promo_price,origin',
      campaign_id: `eq.${c.id}`,
      order: 'sort_index.asc',
    })
    for (const l of lines ?? []) {
      if (l.plu == null || l.origin === 'unassigned') continue
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

/** Obst: zentrale Werbung für eine feste Kalenderwoche (aktive Liste, Archiv-Snapshot oder Benachrichtigungs-Version). */
export function useObstOfferCampaignForKwYear(
  kw: number | undefined,
  jahr: number | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['obst-offer-campaign', 'kw-year', kw, jahr],
    staleTime: 60_000,
    queryFn: async (): Promise<CampaignWithLines | null> => {
      if (kw == null || jahr == null) return null
      return fetchObstCampaignsMergedForKwYear(kw, jahr)
    },
    enabled: enabled && kw != null && jahr != null && Number.isFinite(kw) && Number.isFinite(jahr),
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
  const { kw, year } = getBackshopWerbungKwYearFromDate(new Date())

  return useQuery({
    queryKey: ['backshop-offer-campaign', kw, year],
    staleTime: 60_000,
    queryFn: async (): Promise<CampaignWithLines | null> => {
      return fetchBackshopCampaignWithLinesAuto()
    },
  })
}

/** KW/Jahr-Paare mit vorhandener Backshop-Zentralwerbung (neueste zuerst), für Masterliste-Dropdown. */
export async function fetchBackshopOfferCampaignSlots(): Promise<Array<{ kw: number; jahr: number }>> {
  const rows = await queryRest<Array<{ kw_nummer: number; jahr: number }>>('backshop_offer_campaigns', {
    select: 'kw_nummer,jahr',
    order: 'jahr.desc,kw_nummer.desc',
  })
  const seen = new Set<string>()
  const out: Array<{ kw: number; jahr: number }> = []
  for (const r of rows ?? []) {
    const key = `${r.jahr}-${r.kw_nummer}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ kw: r.kw_nummer, jahr: r.jahr })
  }
  return out
}

export function useBackshopOfferCampaignSlots() {
  return useQuery({
    queryKey: ['backshop-offer-campaign-slots'],
    staleTime: 60_000,
    queryFn: fetchBackshopOfferCampaignSlots,
  })
}

export type BackshopOfferPreviewSelection =
  | { mode: 'auto' }
  | { mode: 'explicit'; kw: number; jahr: number }

/**
 * Backshop-Masterliste: Werbung wahlweise wie bisher (aktuelle/nächste KW) oder explizite KW aus Upload.
 */
export function useBackshopOfferCampaignWithPreview(selection: BackshopOfferPreviewSelection) {
  const anchor = getBackshopWerbungKwYearFromDate(new Date())

  return useQuery({
    queryKey:
      selection.mode === 'auto'
        ? (['backshop-offer-campaign', 'preview', 'auto', anchor.kw, anchor.year] as const)
        : (['backshop-offer-campaign', 'preview', 'explicit', selection.kw, selection.jahr] as const),
    staleTime: 60_000,
    queryFn: async (): Promise<CampaignWithLines | null> => {
      if (selection.mode === 'auto') return fetchBackshopCampaignWithLinesAuto()
      return fetchBackshopCampaignWithLinesForKwYear(selection.kw, selection.jahr)
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
        source_plu: l.source_plu ?? null,
        source_artikel: l.source_artikel ?? null,
        origin: l.origin ?? (l.plu ? 'excel' : 'unassigned'),
      }))
      const { error: lineErr } = await supabase.from('obst_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaign'] })
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaigns-admin'] })
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaign-detail'] })
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
        source_plu: l.source_plu ?? null,
        source_artikel: l.source_artikel ?? null,
        origin: l.origin ?? (l.plu ? 'excel' : 'unassigned'),
      }))
      const { error: lineErr } = await supabase.from('backshop_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign-slots'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaigns-admin'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign-detail'] })
      toast.success('Zentrale Werbung (Backshop) gespeichert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

// ===========================================================================
// Admin-Uebersicht (Versionen-Seite: Karte "Alle Werbungen")
// ===========================================================================

export type ObstOfferCampaignAdminSummary = {
  id: string
  kw_nummer: number
  jahr: number
  campaign_kind: ObstCentralCampaignKind
  source_file_name: string | null
  created_at: string
  total_lines: number
  assigned_lines: number
}

export type BackshopOfferCampaignAdminSummary = {
  id: string
  kw_nummer: number
  jahr: number
  source_file_name: string | null
  created_at: string
  total_lines: number
  assigned_lines: number
}

type CampaignLineCountRow = {
  campaign_id: string
  plu: string | null
  origin: 'excel' | 'manual' | 'unassigned'
}

async function fetchCampaignLineCounts(
  linesTable: 'obst_offer_campaign_lines' | 'backshop_offer_campaign_lines',
  campaignIds: string[],
): Promise<Map<string, { total: number; assigned: number }>> {
  const counts = new Map<string, { total: number; assigned: number }>()
  for (const id of campaignIds) counts.set(id, { total: 0, assigned: 0 })
  if (campaignIds.length === 0) return counts

  const ids = campaignIds.map((id) => `"${id}"`).join(',')
  const rows = await queryRest<CampaignLineCountRow[]>(linesTable, {
    select: 'campaign_id,plu,origin',
    campaign_id: `in.(${ids})`,
  })
  for (const r of rows ?? []) {
    const entry = counts.get(r.campaign_id)
    if (!entry) continue
    entry.total += 1
    if (r.plu != null && r.origin !== 'unassigned') entry.assigned += 1
  }
  return counts
}

export function useObstOfferCampaignsAdminList() {
  return useQuery({
    queryKey: ['obst-offer-campaigns-admin'],
    staleTime: 30_000,
    queryFn: async (): Promise<ObstOfferCampaignAdminSummary[]> => {
      const campaigns = await queryRest<ObstOfferCampaign[]>('obst_offer_campaigns', {
        select: 'id,kw_nummer,jahr,campaign_kind,source_file_name,created_at',
        order: 'jahr.desc,kw_nummer.desc,campaign_kind.asc',
      })
      const list = campaigns ?? []
      const counts = await fetchCampaignLineCounts(
        'obst_offer_campaign_lines',
        list.map((c) => c.id),
      )
      return list.map((c) => {
        const k = counts.get(c.id) ?? { total: 0, assigned: 0 }
        return {
          id: c.id,
          kw_nummer: c.kw_nummer,
          jahr: c.jahr,
          campaign_kind: c.campaign_kind as ObstCentralCampaignKind,
          source_file_name: c.source_file_name ?? null,
          created_at: c.created_at,
          total_lines: k.total,
          assigned_lines: k.assigned,
        }
      })
    },
  })
}

export function useBackshopOfferCampaignsAdminList() {
  return useQuery({
    queryKey: ['backshop-offer-campaigns-admin'],
    staleTime: 30_000,
    queryFn: async (): Promise<BackshopOfferCampaignAdminSummary[]> => {
      const campaigns = await queryRest<BackshopOfferCampaign[]>('backshop_offer_campaigns', {
        select: 'id,kw_nummer,jahr,source_file_name,created_at',
        order: 'jahr.desc,kw_nummer.desc',
      })
      const list = campaigns ?? []
      const counts = await fetchCampaignLineCounts(
        'backshop_offer_campaign_lines',
        list.map((c) => c.id),
      )
      return list.map((c) => {
        const k = counts.get(c.id) ?? { total: 0, assigned: 0 }
        return {
          id: c.id,
          kw_nummer: c.kw_nummer,
          jahr: c.jahr,
          source_file_name: c.source_file_name ?? null,
          created_at: c.created_at,
          total_lines: k.total,
          assigned_lines: k.assigned,
        }
      })
    },
  })
}

// ===========================================================================
// Admin-Detail (Edit-Seite pro Kampagne)
// ===========================================================================

export type CampaignDetailLine = {
  id: string
  sort_index: number
  plu: string | null
  promo_price: number
  origin: 'excel' | 'manual' | 'unassigned'
  source_plu: string | null
  source_artikel: string | null
  source_art_nr: string | null
}

export type CampaignDetail = {
  id: string
  kw_nummer: number
  jahr: number
  source_file_name: string | null
  created_at: string
  campaign_kind?: ObstCentralCampaignKind
  lines: CampaignDetailLine[]
}

export function useObstOfferCampaignDetail(
  kw: number | null,
  jahr: number | null,
  kind: ObstCentralCampaignKind | null,
) {
  return useQuery({
    queryKey: ['obst-offer-campaign-detail', kw, jahr, kind],
    enabled: kw != null && jahr != null && kind != null,
    staleTime: 10_000,
    queryFn: async (): Promise<CampaignDetail | null> => {
      if (kw == null || jahr == null || kind == null) return null
      const campaigns = await queryRest<ObstOfferCampaign[]>('obst_offer_campaigns', {
        select: 'id,kw_nummer,jahr,campaign_kind,source_file_name,created_at',
        kw_nummer: `eq.${kw}`,
        jahr: `eq.${jahr}`,
        campaign_kind: `eq.${kind}`,
      })
      const c = campaigns?.[0]
      if (!c) return null
      const lines = await queryRest<ObstOfferCampaignLine[]>('obst_offer_campaign_lines', {
        select: 'id,sort_index,plu,promo_price,origin,source_plu,source_artikel,source_art_nr',
        campaign_id: `eq.${c.id}`,
        order: 'sort_index.asc',
      })
      return {
        id: c.id,
        kw_nummer: c.kw_nummer,
        jahr: c.jahr,
        campaign_kind: c.campaign_kind as ObstCentralCampaignKind,
        source_file_name: c.source_file_name ?? null,
        created_at: c.created_at,
        lines: (lines ?? []).map((l) => ({
          id: l.id,
          sort_index: l.sort_index,
          plu: l.plu,
          promo_price: Number(l.promo_price),
          origin: l.origin,
          source_plu: l.source_plu ?? null,
          source_artikel: l.source_artikel ?? null,
          source_art_nr: l.source_art_nr ?? null,
        })),
      }
    },
  })
}

export function useBackshopOfferCampaignDetail(kw: number | null, jahr: number | null) {
  return useQuery({
    queryKey: ['backshop-offer-campaign-detail', kw, jahr],
    enabled: kw != null && jahr != null,
    staleTime: 10_000,
    queryFn: async (): Promise<CampaignDetail | null> => {
      if (kw == null || jahr == null) return null
      const campaigns = await queryRest<BackshopOfferCampaign[]>('backshop_offer_campaigns', {
        select: 'id,kw_nummer,jahr,source_file_name,created_at',
        kw_nummer: `eq.${kw}`,
        jahr: `eq.${jahr}`,
      })
      const c = campaigns?.[0]
      if (!c) return null
      const lines = await queryRest<BackshopOfferCampaignLine[]>('backshop_offer_campaign_lines', {
        select: 'id,sort_index,plu,promo_price,origin,source_plu,source_artikel,source_art_nr',
        campaign_id: `eq.${c.id}`,
        order: 'sort_index.asc',
      })
      return {
        id: c.id,
        kw_nummer: c.kw_nummer,
        jahr: c.jahr,
        source_file_name: c.source_file_name ?? null,
        created_at: c.created_at,
        lines: (lines ?? []).map((l) => ({
          id: l.id,
          sort_index: l.sort_index,
          plu: l.plu,
          promo_price: Number(l.promo_price),
          origin: l.origin,
          source_plu: l.source_plu ?? null,
          source_artikel: l.source_artikel ?? null,
          source_art_nr: l.source_art_nr ?? null,
        })),
      }
    },
  })
}

// ===========================================================================
// Admin-Update (Edit-Seite speichert komplette Zeilen neu)
// ===========================================================================

export function useUpdateObstOfferCampaignLines() {
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

      const existing = await queryRest<ObstOfferCampaign[]>('obst_offer_campaigns', {
        select: 'id,source_file_name',
        kw_nummer: `eq.${payload.kwNummer}`,
        jahr: `eq.${payload.jahr}`,
        campaign_kind: `eq.${payload.campaignKind}`,
      })
      let campaignId = existing?.[0]?.id ?? null

      if (campaignId) {
        const { error: delErr } = await supabase
          .from('obst_offer_campaign_lines')
          .delete()
          .eq('campaign_id', campaignId)
        if (delErr) throw delErr
        if (payload.fileName !== undefined) {
          const { error: updErr } = await supabase
            .from('obst_offer_campaigns')
            .update({ source_file_name: payload.fileName } as never)
            .eq('id', campaignId)
          if (updErr) throw updErr
        }
      } else {
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
        campaignId = (camp as { id: string }).id
      }

      if (payload.lines.length === 0) return

      const lineRows = payload.lines.map((l, i) => ({
        campaign_id: campaignId!,
        plu: l.plu,
        promo_price: l.promo_price,
        sort_index: i,
        source_art_nr: l.source_art_nr ?? null,
        source_plu: l.source_plu ?? null,
        source_artikel: l.source_artikel ?? null,
        origin: l.origin ?? (l.plu ? 'excel' : 'unassigned'),
      }))
      const { error: lineErr } = await supabase.from('obst_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaign'] })
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaigns-admin'] })
      queryClient.invalidateQueries({ queryKey: ['obst-offer-campaign-detail'] })
      toast.success('Werbung aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}

export function useUpdateBackshopOfferCampaignLines() {
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

      const existing = await queryRest<BackshopOfferCampaign[]>('backshop_offer_campaigns', {
        select: 'id,source_file_name',
        kw_nummer: `eq.${payload.kwNummer}`,
        jahr: `eq.${payload.jahr}`,
      })
      let campaignId = existing?.[0]?.id ?? null

      if (campaignId) {
        const { error: delErr } = await supabase
          .from('backshop_offer_campaign_lines')
          .delete()
          .eq('campaign_id', campaignId)
        if (delErr) throw delErr
        if (payload.fileName !== undefined) {
          const { error: updErr } = await supabase
            .from('backshop_offer_campaigns')
            .update({ source_file_name: payload.fileName } as never)
            .eq('id', campaignId)
          if (updErr) throw updErr
        }
      } else {
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
        campaignId = (camp as { id: string }).id
      }

      if (payload.lines.length === 0) return

      const lineRows = payload.lines.map((l, i) => ({
        campaign_id: campaignId!,
        plu: l.plu,
        promo_price: l.promo_price,
        sort_index: i,
        source_art_nr: l.source_art_nr ?? null,
        source_plu: l.source_plu ?? null,
        source_artikel: l.source_artikel ?? null,
        origin: l.origin ?? (l.plu ? 'excel' : 'unassigned'),
      }))
      const { error: lineErr } = await supabase.from('backshop_offer_campaign_lines').insert(lineRows as never[])
      if (lineErr) throw lineErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign-slots'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaigns-admin'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-offer-campaign-detail'] })
      toast.success('Werbung aktualisiert')
    },
    onError: (err) => {
      toast.error(`Fehler: ${formatError(err)}`)
    },
  })
}
