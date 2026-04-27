import type { ObstOfferNameHighlightKind } from '@/lib/offer-display'
import { cn } from '@/lib/utils'

/**
 * Hintergrund für die Artikelnamen-Zelle bei Obst-Werbung (nicht PLU-Spalte).
 * exit, ordersatz_week und manuelle Werbung: Wochen-Gelb; ordersatz_3day: helleres Gelb.
 */
export function obstOfferNameHighlightClass(kind?: ObstOfferNameHighlightKind): string {
  if (!kind) return ''
  if (kind === 'ordersatz_3day') return 'bg-offer-3day-name-bg text-offer-3day-name-text'
  return 'bg-offer-week-name-bg text-offer-week-name-text'
}

/** Wrapper um Namen + Offer-Badge bei Obst-Werbung */
export function obstOfferNameInnerClass(listType: 'obst' | 'backshop', kind?: ObstOfferNameHighlightKind): string {
  return cn(
    'inline-flex items-center gap-1.5 flex-wrap',
    listType === 'obst' && obstOfferNameHighlightClass(kind),
  )
}
