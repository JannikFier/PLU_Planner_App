// Aufgelöste Backshop-Werbungszeilen: Kampagne + Stammdaten (Name, Bild) für UI

import { useMemo } from 'react'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopOfferCampaignDetail } from '@/hooks/useCentralOfferCampaigns'

/** Eine sichtbare Werbezeile mit Master-Daten (Kalenderwoche-Detail) */
export type BackshopWerbungResolvedLine = {
  lineId: string
  sort_index: number
  plu: string
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
 * Nur zugeordnete Zeilen (nicht „unassigned“).
 */
export function useBackshopWerbungLinesWithMaster(
  kw: number | null,
  jahr: number | null,
  options?: { enabled?: boolean },
) {
  const enabledTop = options?.enabled ?? true
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

  const resolvedLines: BackshopWerbungResolvedLine[] = useMemo(() => {
    const detail = detailQuery.data
    if (!detail?.lines?.length) return []
    const masters = mastersQuery.data ?? []
    const map = new Map(masters.map((m) => [m.plu, m]))
    return detail.lines
      .filter((l): l is typeof l & { plu: string } => !!l.plu && l.origin !== 'unassigned')
      .map((line) => {
        const m = map.get(line.plu)
        const dn =
          (m?.display_name?.trim() ||
            m?.system_name?.trim() ||
            line.source_artikel?.trim() ||
            line.plu) ??
          line.plu
        return {
          lineId: line.id,
          sort_index: line.sort_index,
          plu: line.plu,
          promo_price: line.promo_price,
          purchase_price: line.purchase_price ?? null,
          list_ek: line.list_ek ?? null,
          list_vk: line.list_vk ?? null,
          source_art_nr: line.source_art_nr ?? null,
          source_artikel: line.source_artikel,
          display_name: dn,
          image_url: m?.image_url ?? null,
        }
      })
  }, [detailQuery.data, mastersQuery.data])

  const isLoading =
    (enabled && detailQuery.isLoading) ||
    (!!versionId && enabled && mastersQuery.isLoading)

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
    isError: detailQuery.isError || mastersQuery.isError,
    /** Aktive Backshop-Version (für Bilder/Stammdaten) */
    backshopVersionId: versionId ?? null,
  }
}
