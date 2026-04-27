// Kalenderwochen- und Jahr-Helfer für Upload und Versionen

import {
  addDays,
  addWeeks,
  compareAsc,
  differenceInCalendarWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
} from 'date-fns'
import { de } from 'date-fns/locale'

/** Anzahl KWs vor/nach aktueller KW in der Upload-Auswahl */
const KW_RANGE = 3

/** Anzahl Kalenderwochen (±) für die Zentral-Werbungs-KW-Auswahl (5 Einträge: −2 … +2) */
const CAMPAIGN_KW_RANGE_WEEKS = 2

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

/** Aktuelle ISO-8601-Kalenderwoche (1–53), wie in Deutschland üblich. */
export function getCurrentKW(): number {
  return getISOWeek(new Date())
}

/**
 * ISO-8601-Kalenderwoche und ISO-Kalenderjahr zu einem Datum.
 * date-fns `getWeek(..., { firstWeekContainsDate: 4 })` weicht in Randfällen von `getISOWeek` ab;
 * für eine einheitliche KW nutzen wir durchgängig getISOWeek/getISOWeekYear.
 */
export function getKWAndYearFromDate(date: Date): { kw: number; year: number } {
  return {
    kw: getISOWeek(date),
    year: getISOWeekYear(date),
  }
}

/**
 * Backshop Zentralwerbung: Ankerdatum für die ISO-KW-Ermittlung.
 * Handelsübliche Woche Mo–Sa: ab **Sonntag** 00:00 und ab **Samstag** ≥ 23:59 (lokal)
 * wird die **folgende** ISO-KW verwendet (Anker = kommender Montag 12:00).
 */
export function getBackshopWerbungAnchorDate(now: Date): Date {
  const y = now.getFullYear()
  const mo = now.getMonth()
  const d = now.getDate()
  const day = now.getDay()
  const h = now.getHours()
  const min = now.getMinutes()
  const saturdayLate = day === 6 && (h > 23 || (h === 23 && min >= 59))
  const sunday = day === 0
  if (!sunday && !saturdayLate) return now

  const out = new Date(y, mo, d, 12, 0, 0, 0)
  if (sunday) {
    out.setDate(d + 1)
  } else {
    out.setDate(d + 2)
  }
  return out
}

/** ISO-KW/-Jahr für Backshop-Werbung unter Berücksichtigung von {@link getBackshopWerbungAnchorDate}. */
export function getBackshopWerbungKwYearFromDate(now: Date): { kw: number; year: number } {
  return getKWAndYearFromDate(getBackshopWerbungAnchorDate(now))
}

/** Kurzformat „KW 12 · 2026“ für Toolbars und Dialoge. */
export function formatKwDotYear(kw: number, year: number): string {
  return `KW ${kw} · ${year}`
}

/**
 * Backshop-Masterliste: eine Zeile für „aktive Liste“ von Einspiel-KW bis heute.
 * - Dieselbe KW wie heute: `KW 10 · 2026`
 * - Spätere Wochen gleiches Jahr: `KW 10 – KW 14 · 2026`
 * - Jahreswechsel: `KW 52 · 2026 – KW 2 · 2027`
 */
export function formatBackshopActiveListToolbarRange(
  uploadKw: number,
  uploadYear: number,
  todayKw: number,
  todayYear: number,
): string {
  const uploadMonday = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), uploadYear), uploadKw))
  const todayMonday = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), todayYear), todayKw))
  if (compareAsc(todayMonday, uploadMonday) < 0) {
    return formatKwDotYear(uploadKw, uploadYear)
  }
  if (uploadKw === todayKw && uploadYear === todayYear) {
    return formatKwDotYear(uploadKw, uploadYear)
  }
  if (uploadYear === todayYear) {
    return `KW ${uploadKw} – KW ${todayKw} · ${todayYear}`
  }
  return `${formatKwDotYear(uploadKw, uploadYear)} – ${formatKwDotYear(todayKw, todayYear)}`
}

/**
 * Vergleicht zwei ISO-Kalenderwochen (KW + ISO-Jahr). Negativ wenn a &lt; b, 0 wenn gleich, positiv wenn a &gt; b.
 */
export function compareIsoWeekPair(
  kwA: number,
  yearA: number,
  kwB: number,
  yearB: number,
): number {
  const mondayA = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), yearA), kwA))
  const mondayB = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), yearB), kwB))
  return compareAsc(mondayA, mondayB)
}

/**
 * Zerlegung der Toolbar-Zeile für Backshop: die „hintere“ KW ist die vorgesehene Stelle für die Werbungs-Auswahl.
 * `endKw`/`endYear` = gewähltes Ende (Kalender oder Vorschau-KW).
 */
export type BackshopToolbarWerbungLayout =
  | {
      variant: 'single_line'
      prefixBeforeKw: string
      highlightKw: number
      suffixAfterKw: string
    }
  | {
      variant: 'range_same_year'
      prefixBeforeEndKw: string
      endKw: number
      suffix: string
    }
  | {
      variant: 'range_cross_year'
      leftFixed: string
      endKw: number
      suffix: string
    }

export function getBackshopToolbarWerbungLayout(
  uploadKw: number,
  uploadYear: number,
  endKw: number,
  endYear: number,
): BackshopToolbarWerbungLayout {
  const uploadMonday = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), uploadYear), uploadKw))
  const endMonday = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), endYear), endKw))
  if (compareAsc(endMonday, uploadMonday) < 0) {
    return {
      variant: 'single_line',
      prefixBeforeKw: 'KW ',
      highlightKw: uploadKw,
      suffixAfterKw: ` · ${uploadYear}`,
    }
  }
  if (uploadKw === endKw && uploadYear === endYear) {
    return {
      variant: 'single_line',
      prefixBeforeKw: 'KW ',
      highlightKw: uploadKw,
      suffixAfterKw: ` · ${uploadYear}`,
    }
  }
  if (uploadYear === endYear) {
    return {
      variant: 'range_same_year',
      prefixBeforeEndKw: `KW ${uploadKw} – KW `,
      endKw,
      suffix: ` · ${endYear}`,
    }
  }
  return {
    variant: 'range_cross_year',
    leftFixed: `${formatKwDotYear(uploadKw, uploadYear)} – KW `,
    endKw,
    suffix: ` · ${endYear}`,
  }
}

/**
 * Kurztext wie in der Backshop-Toolbar (eingespielte Liste bis gewählte Werbungs-KW), für PDF-Titel und Dateiname.
 * Bei `showWeekMonSat` wie Toolbar: Mo–Sa nur zur **Listen**-KW (eingespielter Stand).
 */
export function formatBackshopWerbungContextPlainLabel(
  uploadKw: number,
  uploadYear: number,
  endKw: number,
  endYear: number,
  showWeekMonSat: boolean,
): string {
  const layout = getBackshopToolbarWerbungLayout(uploadKw, uploadYear, endKw, endYear)
  let core: string
  if (layout.variant === 'single_line') {
    core = `${layout.prefixBeforeKw}${layout.highlightKw}${layout.suffixAfterKw}`
  } else if (layout.variant === 'range_same_year') {
    core = `${layout.prefixBeforeEndKw}${layout.endKw}${layout.suffix}`
  } else {
    core = `${layout.leftFixed}${layout.endKw}${layout.suffix}`
  }
  if (showWeekMonSat) {
    return `${core} · ${formatIsoWeekMondayToSaturdayDe(uploadKw, uploadYear)}`
  }
  return core
}

/**
 * Kalenderwochen-Abstand (ISO-8601) von der Start-KW bis zur End-KW (inkl.).
 * Basis: Montag der jeweiligen ISO-Woche; für „Neu“-Dauer mit markYellowKwCount nutzen.
 */
export function weeksBetweenIsoWeeks(
  endKw: number,
  endYear: number,
  startKw: number,
  startYear: number,
): number {
  const end = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), endYear), endKw))
  const start = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), startYear), startKw))
  return Math.max(0, differenceInCalendarWeeks(end, start, { weekStartsOn: 1 }))
}

/**
 * Fünf ISO-KW-Optionen: heute ±2 Kalenderwochen (eindeutig nach Jahr+KW).
 * Für Dropdowns „Zentrale Werbung“ (kein freies Zahleneingabe-Feld).
 */
export function getCampaignWeekSelectOptions(from: Date = new Date()): { kw: number; year: number; label: string }[] {
  const seen = new Set<string>()
  const out: { kw: number; year: number; label: string }[] = []
  for (let d = -CAMPAIGN_KW_RANGE_WEEKS; d <= CAMPAIGN_KW_RANGE_WEEKS; d++) {
    const { kw, year } = getKWAndYearFromDate(addWeeks(from, d))
    const key = `${year}-${kw}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ kw, year, label: `KW ${kw} · ${year}` })
  }
  return out
}

/** Standard-Ziel-KW für neue Werbung: nächste ISO-KW (typisch: Vorbereitung für die kommende Woche). */
export function getDefaultCampaignTargetWeek(): { kw: number; year: number } {
  return getKWAndYearFromDate(addWeeks(new Date(), 1))
}

/**
 * Kurzlabel für die **aktuelle ISO-Kalenderwoche** (Werbung, Angebote, „heute“).
 * Unabhängig davon, in welcher KW die PLU-Liste zuletzt eingespielt wurde.
 */
export function getCalendarKwLabel(date: Date = new Date()): string {
  const { kw, year } = getKWAndYearFromDate(date)
  return formatKwDotYear(kw, year)
}

/**
 * Montag bis Samstag der ISO-Kalenderwoche, deutsch (dd.MM.yyyy–dd.MM.yyyy).
 * Verkaufswoche Mo–Sa, konsistent mit ISO-Wochenbeginn (Montag).
 */
export function formatIsoWeekMondayToSaturdayDe(kw: number, isoYear: number): string {
  const monday = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), isoYear), kw))
  const saturday = addDays(monday, 5)
  const fmt = (d: Date) => format(d, 'dd.MM.yyyy', { locale: de })
  return `${fmt(monday)}–${fmt(saturday)}`
}

/**
 * Datenbank-`kw_label` optional um Mo–Sa-Datumsspanne ergänzen (mittlerer Punkt als Trenner).
 */
export function formatKwLabelWithOptionalMonSatRange(
  kwLabel: string,
  kw: number,
  isoYear: number,
  showMonSat: boolean,
): string {
  if (!showMonSat) return kwLabel
  return `${kwLabel} · ${formatIsoWeekMondayToSaturdayDe(kw, isoYear)}`
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
  if (dayStr == null || monthStr == null || yearStr == null) return null
  const day = parseInt(dayStr, 10)
  const month = parseInt(monthStr, 10)
  const year = parseInt(yearStr, 10)
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
