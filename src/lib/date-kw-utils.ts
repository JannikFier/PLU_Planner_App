// Kalenderwochen- und Jahr-Helfer für Upload und Versionen

import { getWeek, getISOWeekYear } from 'date-fns'

/** Anzahl KWs vor/nach aktueller KW in der Upload-Auswahl */
const KW_RANGE = 3

/** Anzahl Jahre vor/nach aktuellem Jahr in der Upload-Auswahl */
const YEAR_RANGE = 1

/**
 * KW-Optionen für Upload-Dropdown: nur aktuelle KW ± 3 (max. 1–53).
 */
export function getKWOptionsForUpload(): number[] {
  const current = getCurrentKW()
  const min = Math.max(1, current - KW_RANGE)
  const max = Math.min(53, current + KW_RANGE)
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/**
 * Jahr-Optionen für Upload-Dropdown: nur aktuelles Jahr ± 1.
 */
export function getUploadYearOptions(): number[] {
  const year = new Date().getFullYear()
  return [year - YEAR_RANGE, year, year + YEAR_RANGE]
}

/**
 * KW auf den Upload-Dropdown-Bereich (aktuelle ± 3) begrenzen, damit die Vorauswahl immer in der Liste liegt.
 */
export function clampKWToUploadRange(kw: number): number {
  const current = getCurrentKW()
  const min = Math.max(1, current - KW_RANGE)
  const max = Math.min(53, current + KW_RANGE)
  return Math.max(min, Math.min(max, kw))
}

/** Aktuelle ISO-Kalenderwoche (1–53) */
export function getCurrentKW(): number {
  return getWeek(new Date(), { firstWeekContainsDate: 4 })
}

/** ISO-Kalenderwoche und -Jahr zu einem Datum (gleiche Logik wie getCurrentKW für Konsistenz). */
export function getKWAndYearFromDate(date: Date): { kw: number; year: number } {
  return {
    kw: getWeek(date, { firstWeekContainsDate: 4 }),
    year: getISOWeekYear(date),
  }
}

/**
 * Nächste freie KW ab currentKW für das gegebene Jahr (Version existiert noch nicht).
 * Wenn keine freie KW im Bereich currentKW..53 gefunden wird, wird currentKW zurückgegeben.
 * In diesem Fall kann currentKW bereits in versions existieren – Aufrufer sollten
 * versionExistsForKW(currentKW, jahr, versions) prüfen und ggf. warnen.
 */
export function getNextFreeKW(
  currentKW: number,
  jahr: number,
  versions: { kw_nummer: number; jahr: number }[] | null | undefined
): number {
  const list = versions ?? []
  const existing = new Set(
    list.filter((v) => v.jahr === jahr).map((v) => v.kw_nummer)
  )
  for (let kw = currentKW; kw <= 53; kw++) {
    if (!existing.has(kw)) return kw
  }
  if (existing.has(currentKW) && import.meta.env.DEV) {
    console.warn(`getNextFreeKW: Keine freie KW in ${jahr} ab KW ${currentKW}; currentKW existiert bereits.`)
  }
  return currentKW
}

/**
 * Liest ein Datum im Format DD.MM.YYYY aus einem Dateinamen und gibt KW und Jahr zurück.
 * Nützlich für Backshop-Dateinamen wie "Kassenblatt ZWS-PLU 20.01.2026.xlsx".
 */
export function parseKWAndYearFromFilename(filename: string): { kw: number; year: number } | null {
  const match = filename.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/)
  if (!match) return null
  const [, dayStr, monthStr, yearStr] = match
  const day = parseInt(dayStr!, 10)
  const month = parseInt(monthStr!, 10)
  const year = parseInt(yearStr!, 10)
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return getKWAndYearFromDate(date)
}

/** Prüft, ob für (kw, jahr) bereits eine Version existiert */
export function versionExistsForKW(
  kw: number,
  jahr: number,
  versions: { kw_nummer: number; jahr: number }[] | null | undefined
): boolean {
  return (versions ?? []).some((v) => v.kw_nummer === kw && v.jahr === jahr)
}
