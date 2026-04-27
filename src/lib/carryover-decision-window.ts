// Freitag/Samstag (Europe/Berlin) in derselben ISO-KW wie `publishedAt`: keine Carryover-Entscheidung.

import { getISOWeek, getISOWeekYear } from 'date-fns'

function berlinYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** ISO-KW/Jahr so, wie sie zu einem Kalendertag in Europe/Berlin gehören (Mittag UTC vermeidet Randfehler). */
function berlinIsoWeekYear(d: Date): { kw: number; year: number } {
  const ymd = berlinYmd(d)
  const [y, m, day] = ymd.split('-').map((x) => parseInt(x, 10))
  const ref = new Date(Date.UTC(y, m - 1, day, 12, 0, 0))
  return { kw: getISOWeek(ref), year: getISOWeekYear(ref) }
}

function berlinWeekday(d: Date): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(d)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[s] ?? 0
}

/**
 * true = Carryover nicht ändern (nur Anzeige): gleiche ISO-KW wie Veröffentlichung und Freitag/Samstag in Berlin.
 */
export function isCarryoverDecisionBlockedBerlin(publishedAtIso: string | null): boolean {
  if (!publishedAtIso) return false
  const pub = new Date(publishedAtIso)
  const now = new Date()
  const pubWy = berlinIsoWeekYear(pub)
  const nowWy = berlinIsoWeekYear(now)
  if (pubWy.kw !== nowWy.kw || pubWy.year !== nowWy.year) return false
  const dow = berlinWeekday(now)
  return dow === 5 || dow === 6
}
