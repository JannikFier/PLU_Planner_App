// Hilfsfunktionen und Thumbnail für den Backshop-Upload-Wizard (gemeinsam für alle Schritte).

import type {
  BackshopCompareItem,
  BackshopSkippedReasons,
  BackshopSkippedDetails,
  BackshopSkippedPosition,
  BackshopDuplicateDetail,
  SameNameDifferentPluEntry,
  DisplayItem,
} from '@/types/plu'

/** Spalte 1-basiert → Excel-Buchstabe (1=A, 2=B, …, 26=Z, 27=AA). */
function colToLetter(col1: number): string {
  let n = col1
  let s = ''
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

/** Kompakt: Buchstabe + Zeile wie in Excel (z. B. C7, AR22). */
function positionCompact(row: number, col: number): string {
  return colToLetter(col) + row
}

/** Formatiert eine Position für ungültige PLU / leerer Name (kompakt). */
function formatPosition(pos: BackshopSkippedPosition): string {
  return positionCompact(pos.row, pos.col)
}

/** Formatiert ein Duplikat: PLU + erstes Mal (C7) + doppelt (AR22). */
export function formatBackshopDuplicate(d: BackshopDuplicateDetail): string {
  const first = positionCompact(d.firstRow, d.firstCol)
  const dup = positionCompact(d.row, d.col)
  return `PLU ${d.plu}: ${first} (erstes Mal), ${dup} (doppelt – zweites Vorkommen, einmal in der App)`
}

/** Formatiert „Gleiche Bezeichnung, verschiedene PLU“: Name + jede PLU mit Position (C7). */
export function formatSameNameDifferentPlu(entry: SameNameDifferentPluEntry): string {
  const parts = entry.occurrences.map((o) => `PLU ${o.plu} in ${positionCompact(o.row, o.col)}`)
  return `${entry.name}: ${parts.join('; ')}`
}

/** Ungültige PLU mit optional Zellinhalt. */
function formatInvalidPluEntry(pos: BackshopSkippedPosition): string {
  const base = formatPosition(pos)
  if (pos.rawCell) return `${base} (Inhalt: ${pos.rawCell})`
  return base
}

/** Formatiert die Aufschlüsselung inkl. Zeile/Spalte zum Nachschlagen. */
export function formatSkippedReasons(
  reasons: BackshopSkippedReasons,
  details?: BackshopSkippedDetails
): string {
  const parts: string[] = []
  if (reasons.invalidPlu > 0) {
    const posList = details?.invalidPlu?.map(formatInvalidPluEntry).join('; ') ?? ''
    parts.push(posList ? `${reasons.invalidPlu}× ungültige PLU (${posList})` : `${reasons.invalidPlu}× ungültige PLU`)
  }
  if (reasons.emptyName > 0) {
    const posList = details?.emptyName?.map(formatPosition).join('; ') ?? ''
    parts.push(posList ? `${reasons.emptyName}× leerer Name/Platzhalter (${posList})` : `${reasons.emptyName}× leerer Name/Platzhalter`)
  }
  if (reasons.duplicatePlu > 0) {
    parts.push(`${reasons.duplicatePlu}× doppelte PLU`)
  }
  return parts.join('. ')
}

/** BackshopCompareItem zu DisplayItem für PLUTable-Vorschau. */
export function backshopItemsToDisplayItems(
  items: BackshopCompareItem[],
  blockIdForItem?: (item: BackshopCompareItem) => string | null,
  blockNameForId?: (blockId: string) => string | null,
): DisplayItem[] {
  return items.map((item) => {
    const block_id = blockIdForItem?.(item) ?? null
    const block_name = block_id && blockNameForId ? blockNameForId(block_id) ?? null : null
    return {
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: item.display_name ?? item.system_name,
      item_type: 'PIECE' as const,
      status: item.status as DisplayItem['status'],
      old_plu: item.old_plu,
      warengruppe: null,
      block_id,
      block_name,
      preis: null,
      is_custom: false,
      is_manually_renamed: item.is_manually_renamed ?? false,
      image_url: item.image_url ?? undefined,
    }
  })
}
