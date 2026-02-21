// Hilfsfunktionen für Werbung/Angebot (Aktion)

import type { OfferItem } from '@/types/database'
import type { BackshopOfferItem } from '@/types/database'

/**
 * Prüft, ob eine KW/Jahr innerhalb des Angebots-Intervalls liegt.
 * Intervall: [start_kw/start_jahr, start_kw/start_jahr + duration_weeks) in KW-Zählung.
 */
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

/**
 * Gibt die Menge der PLUs zurück, die in der angegebenen KW/Jahr als Angebot aktiv sind.
 */
export function getActiveOfferPLUs(
  items: (OfferItem | BackshopOfferItem)[],
  currentKw: number,
  currentJahr: number,
): Set<string> {
  const set = new Set<string>()
  for (const item of items) {
    if (isKwInRange(currentKw, currentJahr, item.start_kw, item.start_jahr, item.duration_weeks)) {
      set.add(item.plu)
    }
  }
  return set
}
