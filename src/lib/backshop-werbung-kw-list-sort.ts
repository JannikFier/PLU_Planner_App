/**
 * Aufteilung für „Werbung bestellen“: aktuelle Handels-KW · kommende KWs · max. 3 jüngste vergangene KWs.
 */

import { compareIsoWeekPair, getBackshopWerbungKwYearFromDate } from '@/lib/date-kw-utils'

/** Anzahl der jüngsten vergangenen Kalenderwochen („die letzten drei“). */
export const BACKSHOP_WERBUNG_KW_LIST_PAST_LIMIT = 3

export type KwJahrRow = { kw_nummer: number; jahr: number }

export type BackshopWerbungKwListBuckets<T extends KwJahrRow> = {
  /** Referenz-KW (Handelslogik wie Toolbar), zur Anzeige z. B. „KW 18/2026“. */
  refKw: number
  refYear: number
  /** Kampagne genau für diese KW, falls vorhanden (max. eines wird genutzt). */
  current: T | null
  /** Kommende Kalenderwochen, chronologisch aufsteigend. */
  future: T[]
  /** Bis zu drei jüngste vergangene KWs, neueste zuerst. */
  past: T[]
}

/**
 * @param items bereits gefilterte Kampagnen (z. B. assigned_lines > 0)
 * @param now Referenzdatum für „aktuelle“ KW (Handelslogik wie Toolbar)
 */
export function partitionCampaignsForBackshopWerbungKwList<T extends KwJahrRow>(
  items: T[],
  now: Date = new Date(),
): BackshopWerbungKwListBuckets<T> {
  const { kw: refKw, year: refYear } = getBackshopWerbungKwYearFromDate(now)

  const currentMatches: T[] = []
  const future: T[] = []
  const past: T[] = []

  for (const item of items) {
    const cmp = compareIsoWeekPair(item.kw_nummer, item.jahr, refKw, refYear)
    if (cmp === 0) currentMatches.push(item)
    else if (cmp > 0) future.push(item)
    else past.push(item)
  }

  future.sort((a, b) =>
    compareIsoWeekPair(a.kw_nummer, a.jahr, b.kw_nummer, b.jahr),
  )
  past.sort((a, b) =>
    compareIsoWeekPair(b.kw_nummer, b.jahr, a.kw_nummer, a.jahr),
  )

  const pastLimited = past.slice(0, BACKSHOP_WERBUNG_KW_LIST_PAST_LIMIT)

  return {
    refKw,
    refYear,
    current: currentMatches[0] ?? null,
    future,
    past: pastLimited,
  }
}

/** Flache Liste (aktuell → Zukunft → Vergangenheit); nur falls eine flache Liste gebraucht wird. */
export function sortCampaignsForBackshopWerbungKwList<T extends KwJahrRow>(
  items: T[],
  now?: Date,
): T[] {
  const b = partitionCampaignsForBackshopWerbungKwList(items, now)
  return b.current ? [b.current, ...b.future, ...b.past] : [...b.future, ...b.past]
}
