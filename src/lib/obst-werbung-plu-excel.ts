// Excel mit PLU-Spalte (z. B. EWK-/Werbungslisten mit Stück/Gewicht) – nur PLUs extrahieren

import { formatError } from '@/lib/error-messages'
import { loadExcelSheetAsRows } from '@/lib/excel-read-helper'

function normalizeHeaderCell(c: unknown): string {
  return String(c ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Zellwert → PLU-String (4–7 Ziffern, wie in der Masterliste üblich) */
export function parsePluCell(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const t = Math.trunc(raw)
    if (t < 0 || t > 9999999) return null
    return String(t)
  }
  const s = String(raw).trim()
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  if (digits.length < 4 || digits.length > 7) return null
  return digits
}

/** Nur PLUs übernehmen, die in der aktuellen Masterliste vorkommen (Reihenfolge bleibt). */
export function filterPluListToMaster(
  plu: string[],
  masterPluSet: Set<string>,
): { accepted: string[]; dropped: string[] } {
  const accepted: string[] = []
  const dropped: string[] = []
  for (const p of plu) {
    if (masterPluSet.has(p)) accepted.push(p)
    else dropped.push(p)
  }
  return { accepted, dropped }
}

export interface ObstWerbungPluExcelParseResult {
  /** Eindeutige PLUs in Reihenfolge des ersten Vorkommens */
  plu: string[]
  fileName: string
  totalRows: number
  skippedRows: number
}

/**
 * Liest eine Excel-Datei und sammelt alle PLUs aus der ersten Spalte mit Header „PLU“ (o. ä.).
 */
export async function parseObstWerbungPluExcel(file: File): Promise<ObstWerbungPluExcelParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)
    let headerRow = -1
    let colPlu = -1

    for (let i = 0; i < Math.min(rawRows.length, 80); i++) {
      const row = rawRows[i]
      if (!row?.length) continue
      const cells = row.map(normalizeHeaderCell)
      const idx = cells.findIndex((c) => {
        if (c === 'plu') return true
        if (c.startsWith('plu ')) return true
        if (c === 'plu-nr' || c === 'plu nr' || c === 'plu.nr' || c === 'plu.nr.') return true
        return false
      })
      if (idx >= 0) {
        headerRow = i
        colPlu = idx
        break
      }
    }

    if (headerRow < 0 || colPlu < 0) {
      throw new Error(
        'Spalte „PLU“ nicht gefunden: Bitte eine Zeile mit Überschrift „PLU“ in der Excel-Datei verwenden.',
      )
    }

    const seen = new Set<string>()
    const plu: string[] = []
    let skippedRows = 0

    for (let i = headerRow + 1; i < rawRows.length; i++) {
      const rawRow = rawRows[i]
      if (!rawRow?.length) {
        skippedRows++
        continue
      }
      const cell = rawRow[colPlu]
      const p = parsePluCell(cell)
      if (!p) {
        skippedRows++
        continue
      }
      if (seen.has(p)) {
        skippedRows++
        continue
      }
      seen.add(p)
      plu.push(p)
    }

    return {
      plu,
      fileName: file.name,
      totalRows: rawRows.length,
      skippedRows,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}
