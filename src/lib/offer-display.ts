// Zusammenführung zentraler Werbung + manueller Werbung für die Anzeige

import type { OfferItem, BackshopOfferItem } from '@/types/database'

export type OfferSourceKind = 'central' | 'manual'

/** Obst: welche zentrale Kampagne gewinnt bei Duplikat-PLU (Namens-Hintergrund) */
export type ObstCentralCampaignKind = 'exit' | 'ordersatz_week' | 'ordersatz_3day'

/** Namens-Hervorhebung in Liste/PDF: zentrale Kampagne oder manuelle Werbung (letztere wie Wochenwerbung, gelb) */
export type ObstOfferNameHighlightKind = ObstCentralCampaignKind | 'manual'

/** Priorität bei gleicher PLU in mehreren Obst-Kampagnen: höher = gewinnt */
export function obstCentralKindPriority(k: ObstCentralCampaignKind): number {
  if (k === 'ordersatz_3day') return 3
  if (k === 'ordersatz_week') return 2
  return 1
}

/** Anzeige-Infos pro PLU (nur Einträge die als Werbung sichtbar sind) */
export interface OfferDisplayInfo {
  promoPrice: number | null
  source: OfferSourceKind
  /** Nur zentral: Originalpreis aus Kampagne (Referenz, auch bei lokalem Preis) */
  centralReferencePrice?: number | null
  /** Nur Obst, zentral: welche Kampagne liefert Preis/Namensfarbe */
  centralCampaignKind?: ObstCentralCampaignKind
}

function isKwInRange(
  currentKw: number,
  currentJahr: number,
  startKw: number,
  startJahr: number,
  durationWeeks: number,
): boolean {
  const current = currentJahr * 53 + currentKw
  const start = startJahr * 53 + startKw
  const end = start + durationWeeks
  return current >= start && current < end
}

export type CampaignLineRow = {
  plu: string
  promo_price: number
  /** Nur Obst: für Namens-Hervorhebung (Exit / Woche / 3-Tage) */
  central_kind?: ObstCentralCampaignKind
}

export type CampaignWithLines = {
  kw_nummer: number
  jahr: number
  lines: CampaignLineRow[]
  /**
   * Obst: alle PLUs aus exit + ordersatz_week + ordersatz_3day (Ausblend-Union).
   * Backshop: nicht gesetzt – es gilt nur `lines`.
   */
  allCentralPluUnion?: string[]
}

/**
 * Nach TanStack-Query-Persistenz (JSON) ist kein Set mehr ein Set (z. B. leeres Objekt).
 * Hooks liefern string[]; ältere Cache-Zustände können defekt sein – immer normalisieren.
 */
export function normalizeStoreDisabledPluSet(raw: unknown): Set<string> {
  if (raw instanceof Set) return new Set(raw)
  if (Array.isArray(raw)) return new Set(raw.map(String))
  return new Set()
}

/**
 * Baut die Map PLU → Anzeige für Werbung (zentral + manuell).
 * Zentral nur wenn Kampagnen-KW/Jahr = aktuelle Kalender-KW; Megafon-aus per disabledPlu.
 * Optional: lokale VK-Preise pro Markt (nur Anzeige; Referenz bleibt centralReferencePrice).
 */
export function buildOfferDisplayMap(
  currentKw: number,
  currentJahr: number,
  campaign: CampaignWithLines | null,
  disabledPlu: Set<string> | string[] | unknown,
  manualItems: (OfferItem | BackshopOfferItem)[],
  localCentralPriceOverrides?: Map<string, number> | null,
): Map<string, OfferDisplayInfo> {
  const map = new Map<string, OfferDisplayInfo>()
  const centralPlu = new Set<string>()
  const disabled = normalizeStoreDisabledPluSet(disabledPlu)

  // Kampagne kommt vom Hook (aktuell passend, ggf. nächste KW) – hier nicht nochmal gegen Kalender prüfen
  if (campaign) {
    for (const ln of campaign.lines) {
      centralPlu.add(ln.plu)
      if (!disabled.has(ln.plu)) {
        const ref = Number(ln.promo_price)
        const local = localCentralPriceOverrides?.get(ln.plu)
        // ref 0 = nur Werbe-Markierung ohne zentralen Aktionspreis (Listenpreis bleibt sichtbar)
        const effective =
          local != null && Number.isFinite(local) && local > 0
            ? local
            : Number.isFinite(ref) && ref > 0
              ? ref
              : null
        map.set(ln.plu, {
          promoPrice: effective,
          source: 'central',
          centralReferencePrice: Number.isFinite(ref) ? ref : null,
          centralCampaignKind: ln.central_kind,
        })
      }
    }
  }

  for (const item of manualItems) {
    if (
      !isKwInRange(
        currentKw,
        currentJahr,
        item.start_kw,
        item.start_jahr,
        item.duration_weeks,
      )
    ) {
      continue
    }
    if (centralPlu.has(item.plu)) continue
    if (map.has(item.plu)) continue
    const raw = item.promo_price
    map.set(item.plu, {
      promoPrice: raw != null && !Number.isNaN(Number(raw)) ? Number(raw) : null,
      source: 'manual',
    })
  }

  return map
}
