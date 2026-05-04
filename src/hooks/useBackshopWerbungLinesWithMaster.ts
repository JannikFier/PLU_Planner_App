// Aufgelöste Backshop-Werbungszeilen: Kampagne + Stammdaten (Name, Bild) für UI

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopOfferCampaignDetail } from '@/hooks/useCentralOfferCampaigns'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { queryRest } from '@/lib/supabase'
import type { BackshopOfferCampaignLineStorePlu } from '@/types/database'

/** Eine sichtbare Werbezeile mit Master-/Custom-Daten (Kalenderwoche-Detail) */
export type BackshopWerbungResolvedLine = {
  lineId: string
  sort_index: number
  /** Effektive PLU für Anzeige/Mengen; null solange pending_custom ohne Markt-Auflösung */
  plu: string | null
  /** Zentrale Zeile: Markt soll noch eigenes Produkt anlegen */
  isPendingWithoutResolution: boolean
  promo_price: number
  purchase_price: number | null
  list_ek: number | null
  list_vk: number | null
  /** Excel „Art. Nr.“ – oft GTIN/EAN für Strichcode */
  source_art_nr: string | null
  source_artikel: string | null
  display_name: string
  image_url: string | null
}

/**
 * Kampagne für KW/Jahr + Zuordnung zu Master-PLUs der aktiven Backshop-Version.
 * Enthält zentrale Zuordnungen, per Markt aufgelöste pending_custom-Zeilen; kein unassigned.
 */
export function useBackshopWerbungLinesWithMaster(
  kw: number | null,
  jahr: number | null,
  options?: { enabled?: boolean },
) {
  const enabledTop = options?.enabled ?? true
  const { currentStoreId } = useCurrentStore()
  const { data: activeBs } = useActiveBackshopVersion()
  const versionId = activeBs?.id
  const enabled = enabledTop && kw != null && jahr != null && Number.isFinite(kw) && Number.isFinite(jahr)

  const detailQuery = useBackshopOfferCampaignDetail(
    enabled ? kw : null,
    enabled ? jahr : null,
  )
  const mastersQuery = useBackshopPLUData(versionId, {
    enabled: enabled && !!versionId,
  })
  const customProductsQuery = useBackshopCustomProducts({
    enabled: enabled && !!currentStoreId,
  })

  const pendingLineIds = useMemo(() => {
    const lines = detailQuery.data?.lines
    if (!lines?.length) return [] as string[]
    return lines
      .filter(
        (l) =>
          l.origin === 'pending_custom' &&
          (l.plu == null || String(l.plu).trim() === ''),
      )
      .map((l) => l.id)
  }, [detailQuery.data?.lines])

  const resolutionsQuery = useQuery({
    queryKey: [
      'backshop-offer-campaign-line-store-plu',
      currentStoreId,
      pendingLineIds.join(','),
    ],
    enabled:
      enabled &&
      !!currentStoreId &&
      pendingLineIds.length > 0 &&
      !!detailQuery.data,
    staleTime: 15_000,
    queryFn: async (): Promise<BackshopOfferCampaignLineStorePlu[]> => {
      if (!currentStoreId || pendingLineIds.length === 0) return []
      const inList = pendingLineIds.join(',')
      const rows = await queryRest<BackshopOfferCampaignLineStorePlu[]>(
        'backshop_offer_campaign_line_store_plu',
        {
          select: '*',
          store_id: `eq.${currentStoreId}`,
          campaign_line_id: `in.(${inList})`,
        },
      )
      return rows ?? []
    },
  })

  const resolvedLines: BackshopWerbungResolvedLine[] = useMemo(() => {
    const detail = detailQuery.data
    if (!detail?.lines?.length) return []
    const masters = mastersQuery.data ?? []
    const customs = customProductsQuery.data ?? []
    const masterByPlu = new Map(masters.map((m) => [m.plu, m]))
    const customByPlu = new Map(customs.map((c) => [c.plu, c]))
    const resByLineId = new Map(
      (resolutionsQuery.data ?? []).map((r) => [r.campaign_line_id, r]),
    )

    const out: BackshopWerbungResolvedLine[] = []

    for (const line of detail.lines) {
      if (line.origin === 'unassigned') continue

      if (line.plu != null && String(line.plu).trim() !== '') {
        const plu = String(line.plu).trim()
        const m = masterByPlu.get(plu)
        const dn =
          (m?.display_name?.trim() ||
            m?.system_name?.trim() ||
            line.source_artikel?.trim() ||
            plu) ??
          plu
        out.push({
          lineId: line.id,
          sort_index: line.sort_index,
          plu,
          isPendingWithoutResolution: false,
          promo_price: line.promo_price,
          purchase_price: line.purchase_price ?? null,
          list_ek: line.list_ek ?? null,
          list_vk: line.list_vk ?? null,
          source_art_nr: line.source_art_nr ?? null,
          source_artikel: line.source_artikel,
          display_name: dn,
          image_url: m?.image_url ?? null,
        })
        continue
      }

      if (line.origin === 'pending_custom') {
        const res = resByLineId.get(line.id)
        const effPlu = res?.plu?.trim() ? res.plu.trim() : null
        const m = effPlu ? masterByPlu.get(effPlu) : undefined
        const c = effPlu && !m ? customByPlu.get(effPlu) : undefined
        const dn =
          (m?.display_name?.trim() ||
            m?.system_name?.trim() ||
            c?.name?.trim() ||
            line.source_artikel?.trim() ||
            effPlu ||
            'Neues Produkt') ?? 'Neues Produkt'
        const imageUrl = m?.image_url ?? c?.image_url ?? null
        out.push({
          lineId: line.id,
          sort_index: line.sort_index,
          plu: effPlu,
          isPendingWithoutResolution: !effPlu,
          promo_price: line.promo_price,
          purchase_price: line.purchase_price ?? null,
          list_ek: line.list_ek ?? null,
          list_vk: line.list_vk ?? null,
          source_art_nr: line.source_art_nr ?? null,
          source_artikel: line.source_artikel,
          display_name: dn,
          image_url: imageUrl,
        })
      }
    }

    out.sort((a, b) => a.sort_index - b.sort_index)
    return out
  }, [
    detailQuery.data,
    mastersQuery.data,
    customProductsQuery.data,
    resolutionsQuery.data,
  ])

  const isLoading =
    (enabled && detailQuery.isLoading) ||
    (!!versionId && enabled && mastersQuery.isLoading) ||
    (enabled && !!currentStoreId && customProductsQuery.isLoading) ||
    (enabled && pendingLineIds.length > 0 && resolutionsQuery.isLoading)

  return {
    campaignMeta: detailQuery.data
      ? {
          id: detailQuery.data.id,
          kw_nummer: detailQuery.data.kw_nummer,
          jahr: detailQuery.data.jahr,
          source_file_name: detailQuery.data.source_file_name,
          auslieferung_ab: detailQuery.data.auslieferung_ab ?? null,
        }
      : null,
    resolvedLines,
    isLoading,
    isError:
      detailQuery.isError ||
      mastersQuery.isError ||
      customProductsQuery.isError ||
      resolutionsQuery.isError,
    /** Aktive Backshop-Version (für Bilder/Stammdaten) */
    backshopVersionId: versionId ?? null,
  }
}
