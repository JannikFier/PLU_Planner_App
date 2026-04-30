// Texte für Auslieferung (Backshop Exit) relativ zu „heute“

import { de } from 'date-fns/locale'
import { differenceInCalendarDays, format } from 'date-fns'

export type AuslieferungCountdownLines = {
  /** Hauptzeile, z. B. „Noch 3 Tage“ */
  primary: string
  /** Nebenzeile, z. B. „Auslieferung ab 06.05.2026“ */
  secondary: string
}

function parseLocalDateOnly(isoYyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoYyyyMmDd.trim())
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

/**
 * Liefert zwei Zeilen für die UI aus einem ISO-Datum (yyyy-MM-dd) oder null.
 * Kalendertage in lokaler Zeitzone.
 */
export function formatAuslieferungCountdown(
  auslieferungAbIso: string | null | undefined,
  nowInput: Date = new Date(),
): AuslieferungCountdownLines | null {
  if (auslieferungAbIso == null || auslieferungAbIso === '') return null
  const target0 = parseLocalDateOnly(auslieferungAbIso)
  if (!target0) return null

  const today0 = new Date(nowInput.getFullYear(), nowInput.getMonth(), nowInput.getDate())
  const diff = differenceInCalendarDays(target0, today0)
  const dateStr = format(target0, 'dd.MM.yyyy', { locale: de })

  if (diff > 0) {
    const primary = diff === 1 ? 'Noch 1 Tag' : `Noch ${diff} Tage`
    return { primary, secondary: `Auslieferung ab ${dateStr}` }
  }
  if (diff === 0) {
    return { primary: 'Auslieferung heute', secondary: dateStr }
  }
  const past = -diff
  const primary = past === 1 ? 'Seit 1 Tag ausgeliefert' : `Seit ${past} Tagen ausgeliefert`
  return { primary, secondary: `Auslieferung ab ${dateStr}` }
}

/** Eine Zeile für kompakte Listen (z. B. KW-Übersicht) */
export function formatAuslieferungCountdownOneLine(
  auslieferungAbIso: string | null | undefined,
  nowInput: Date = new Date(),
): string | null {
  const full = formatAuslieferungCountdown(auslieferungAbIso, nowInput)
  if (!full) return null
  return `${full.primary} · ${full.secondary}`
}
