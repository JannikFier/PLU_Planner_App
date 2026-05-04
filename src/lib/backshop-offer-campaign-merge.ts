/**
 * Beim erneuten Exit-Upload einer KW: fehlende Excel-Art.-Nr. (`source_art_nr`)
 * aus der vorherigen Kampagne pro Master-PLU übernehmen, wenn das neue Excel keine liefert.
 * Neu gesetzte Art.-Nr. im Import gewinnt immer.
 */

export type LineWithPluAndArtNr = {
  plu: string | null
  source_art_nr?: string | null
}

/** Letzte nicht-leere Art.-Nr. pro PLU (bei Duplikaten gewinnt die spätere Zeile). */
export function buildSourceArtNrMapFromLines(
  lines: ReadonlyArray<{ plu: string | null; source_art_nr: string | null }>,
): Map<string, string> {
  const m = new Map<string, string>()
  for (const row of lines) {
    if (!row.plu) continue
    const v = row.source_art_nr?.trim()
    if (v) m.set(row.plu, v)
  }
  return m
}

export function mergeSourceArtNrFromPreviousCampaign<T extends LineWithPluAndArtNr>(
  lines: T[],
  previousByPlu: Map<string, string>,
): T[] {
  if (previousByPlu.size === 0) return lines
  return lines.map((line) => {
    const plu = line.plu
    if (!plu) return line
    const incoming = line.source_art_nr?.trim()
    if (incoming) return line
    const prev = previousByPlu.get(plu)
    if (!prev?.trim()) return line
    return { ...line, source_art_nr: prev }
  })
}
