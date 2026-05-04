// Merge: zentrale Backshop-Kampagnenzeilen + marktbezogene PLU-Aufloesung fuer pending_custom (Angebots-Map)

import type { CampaignLineRow } from '@/lib/offer-display'

export type RawBackshopCampaignLineLite = {
  id: string
  plu: string | null
  promo_price: number
  origin: string
}

export type BackshopCampaignLineStoreResolution = {
  campaign_line_id: string
  plu: string
}

/**
 * Baut die PLU-Liste fuer buildOfferDisplayMap: zentrale Zuordnungen + pro Markt aufgeloeste pending_custom-Zeilen.
 * Doppelte PLU: erste Zuordnung gewinnt (zentrale Zeilen vor Aufloesungen).
 */
export function mergeBackshopDisplayLinesForOfferMap(
  lines: RawBackshopCampaignLineLite[],
  resolutions: BackshopCampaignLineStoreResolution[],
): CampaignLineRow[] {
  const resByLine = new Map(resolutions.map((r) => [r.campaign_line_id, r.plu]))
  const out: CampaignLineRow[] = []
  const seenPlu = new Set<string>()

  for (const l of lines) {
    if (l.plu != null && String(l.plu).trim() !== '' && l.origin !== 'unassigned') {
      const plu = String(l.plu).trim()
      if (!seenPlu.has(plu)) {
        out.push({ plu, promo_price: l.promo_price })
        seenPlu.add(plu)
      }
    }
  }

  for (const l of lines) {
    if (l.origin !== 'pending_custom' || (l.plu != null && String(l.plu).trim() !== '')) continue
    const plu = resByLine.get(l.id)
    if (!plu || seenPlu.has(plu)) continue
    out.push({ plu, promo_price: l.promo_price })
    seenPlu.add(plu)
  }

  return out
}
