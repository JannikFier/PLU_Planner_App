// Backshop-Upload: Reconciliation & CSV-Export (nur Client, keine Parser-Logik ändern)

import type { BackshopParseResult, ParsedBackshopRow } from '@/types/plu'

/** Max. Länge für rawCell in skippedDetails (UI & Speicher). */
export const BACKSHOP_SKIPPED_RAW_MAX_LEN = 50

/** Kürzt Zelltext für Diagnose-Anzeige. */
export function truncateSkippedCellRaw(raw: string): string {
  const t = raw.replace(/\s+/g, ' ').trim()
  if (t.length <= BACKSHOP_SKIPPED_RAW_MAX_LEN) return t
  return `${t.slice(0, BACKSHOP_SKIPPED_RAW_MAX_LEN - 1)}…`
}

/** Zusammenfassung für die Analyse-Karte (Schritt 1 / Review). */
export interface BackshopParseAnalysisSummary {
  /** Eindeutige importierte Zeilen (= totalRows). */
  uniqueImported: number
  /** Anzahl übersprungener Spalten/Zeilen wegen zweiter gleicher PLU. */
  duplicateSecondColumns: number
  /** totalRows + duplicatePlu – Spalten mit gültiger PLU+Name vor Deduplizierung (Plausibilität). */
  grossColumnsBeforeDedupe: number
  invalidPlu: number
  emptyName: number
  skippedRowsTotal: number
  /** invalid + empty + duplicate – sollte skippedRowsTotal entsprechen. */
  skippedSumParts: number
  /** Ob Summe der Gründe mit skippedRows übereinstimmt (Rundungs-/Logik-Check). */
  skippedSumMatches: boolean
  sameNameDifferentPluCount: number
}

export function buildBackshopParseAnalysis(result: BackshopParseResult): BackshopParseAnalysisSummary {
  const r = result.skippedReasons
  const dup = r?.duplicatePlu ?? 0
  const inv = r?.invalidPlu ?? 0
  const emp = r?.emptyName ?? 0
  const parts = inv + emp + dup
  const skippedTotal = result.skippedRows
  return {
    uniqueImported: result.totalRows,
    duplicateSecondColumns: dup,
    grossColumnsBeforeDedupe: result.totalRows + dup,
    invalidPlu: inv,
    emptyName: emp,
    skippedRowsTotal: skippedTotal,
    skippedSumParts: parts,
    skippedSumMatches: parts === skippedTotal,
    sameNameDifferentPluCount: result.sameNameDifferentPlu?.length ?? 0,
  }
}

/** CSV aus geparsten Zeilen (Semikolon, UTF-8 BOM für Excel). */
export function buildBackshopRowsCsv(rows: ParsedBackshopRow[]): string {
  const header = ['plu', 'system_name', 'plu_zeile_excel', 'plu_spalte_excel']
  const lines = [header.join(';')]
  for (const row of rows) {
    const plu = row.plu.replace(/"/g, '""')
    const name = (row.systemName ?? '').replace(/"/g, '""')
    const pr = row.pluSheetRow != null ? String(row.pluSheetRow) : ''
    const pc = row.pluSheetCol != null ? String(row.pluSheetCol) : ''
    lines.push(`"${plu}";"${name}";${pr};${pc}`)
  }
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadBackshopParseResultCsv(rows: ParsedBackshopRow[], baseFileName: string): void {
  const csv = buildBackshopRowsCsv(rows)
  const safe = baseFileName.replace(/\.[^/.]+$/, '').replace(/[^\wäöüÄÖÜß-]+/gi, '_')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe}_plu_liste.csv`
  a.click()
  URL.revokeObjectURL(url)
}
