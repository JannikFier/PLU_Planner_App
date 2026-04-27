// Excel mit PLU-Spalte (z. B. EWK-/Werbungslisten mit Stück/Gewicht) – PLUs + Zeilen für Review-UI

import { formatError } from '@/lib/error-messages'
import { loadExcelSheetAsRows } from '@/lib/excel-read-helper'

function normalizeHeaderCell(c: unknown): string {
  return String(c ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Erkennt Kopfzellen wie „PLU“, „PLU-Nr.“ oder „ZWS PLU“ (normalisiert). */
function matchesPluHeaderCell(c: string): boolean {
  if (c === 'plu') return true
  if (c.startsWith('plu ')) return true
  if (c === 'plu-nr' || c === 'plu nr' || c === 'plu.nr' || c === 'plu.nr.') return true
  if (c.includes('zws') && c.includes('plu')) return true
  return false
}

/** Spalte „Artikel“, „Bezeichnung“, „Name“ o. ä. (nicht PLU-Spalte). */
function matchesArtikelHeaderCell(c: string, colPlu: number, colIndex: number): boolean {
  if (colIndex === colPlu) return false
  if (c === 'artikel' || c.startsWith('artikel ')) return true
  if (c === 'bezeichnung' || c.startsWith('bezeichnung')) return true
  if (c === 'name' || c === 'benennung' || c.startsWith('waren')) return true
  return false
}

/** Sucht in der Kopfzeile die Artikel-Spalte; sonst Fallback rechts neben PLU. */
function resolveArtikelColumnIndex(headerRowCells: string[], colPlu: number, rowLength: number): number {
  for (let j = 0; j < headerRowCells.length; j++) {
    const h = headerRowCells[j] ?? ''
    if (matchesArtikelHeaderCell(h, colPlu, j)) return j
  }
  const neighbor = colPlu + 1
  return neighbor < rowLength ? neighbor : -1
}

function maxColumnCount(rows: unknown[][]): number {
  let m = 0
  for (const row of rows) {
    if (row?.length && row.length > m) m = row.length
  }
  return m
}

function inferBestPluColumnIndex(rawRows: unknown[][]): number {
  const colLimit = Math.min(6, Math.max(1, maxColumnCount(rawRows)))
  let bestCol = -1
  let bestScore = 0
  for (let c = 0; c < colLimit; c++) {
    let score = 0
    for (let r = 0; r < rawRows.length; r++) {
      const cell = rawRows[r]?.[c]
      if (parsePluCell(cell)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestCol = c
    }
  }
  return bestCol
}

function cellAsArtikelHint(raw: unknown): string {
  if (raw == null || raw === '') return ''
  const s = String(raw).trim()
  return s.length > 0 ? s : ''
}

export interface ParsedObstWerbungLine {
  /** PLU aus der Excel-Zelle */
  excelPlu: string
  /** 1-basierte Excel-Zeile (wie Anzeige) */
  rowIndex: number
  /** Text aus Artikel-Spalte oder Spalte rechts neben PLU */
  artikelHint: string
}

function collectLinesFromColumn(
  rawRows: unknown[][],
  startRow: number,
  colPlu: number,
  colArtikel: number,
): { lines: ParsedObstWerbungLine[]; skippedRows: number } {
  const seen = new Set<string>()
  const lines: ParsedObstWerbungLine[] = []
  let skippedRows = 0

  for (let i = startRow; i < rawRows.length; i++) {
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
    const artikelHint =
      colArtikel >= 0 && colArtikel < rawRow.length ? cellAsArtikelHint(rawRow[colArtikel]) : ''
    lines.push({
      excelPlu: p,
      rowIndex: i + 1,
      artikelHint,
    })
  }

  return { lines, skippedRows }
}

export interface ExtractPluFromRowsResult {
  plu: string[]
  lines: ParsedObstWerbungLine[]
  skippedRows: number
}

/**
 * Sammelt PLUs und Zeilen aus Tabellen: Kopfzeile „PLU“ / „ZWS PLU“ oder Spalten-Inferenz.
 */
export function extractPluListFromObstWerbungRows(rawRows: unknown[][]): ExtractPluFromRowsResult {
  if (!rawRows.length) {
    return { plu: [], lines: [], skippedRows: 0 }
  }

  let headerRow = -1
  let colPlu = -1

  for (let i = 0; i < Math.min(rawRows.length, 80); i++) {
    const row = rawRows[i]
    if (!row?.length) continue
    const cells = row.map(normalizeHeaderCell)
    const idx = cells.findIndex((c) => matchesPluHeaderCell(c))
    if (idx >= 0) {
      headerRow = i
      colPlu = idx
      break
    }
  }

  if (headerRow >= 0 && colPlu >= 0) {
    const headerCells = (rawRows[headerRow] ?? []).map(normalizeHeaderCell)
    const colArtikel = resolveArtikelColumnIndex(headerCells, colPlu, rawRows[headerRow]?.length ?? 0)
    const { lines, skippedRows } = collectLinesFromColumn(rawRows, headerRow + 1, colPlu, colArtikel)
    const plu = lines.map((l) => l.excelPlu)
    return { plu, lines, skippedRows }
  }

  const inferredCol = inferBestPluColumnIndex(rawRows)
  if (inferredCol < 0) {
    throw new Error(
      'Spalte „PLU“ nicht gefunden: Bitte eine Zeile mit „PLU“ oder „ZWS PLU“ nutzen, oder eine Spalte mit gültigen PLU-Nummern (4–7 Ziffern).',
    )
  }

  const maxCol = maxColumnCount(rawRows)
  const colArtikel = inferredCol + 1 < maxCol ? inferredCol + 1 : -1
  const { lines, skippedRows } = collectLinesFromColumn(rawRows, 0, inferredCol, colArtikel)

  if (lines.length === 0) {
    throw new Error(
      'Keine gültigen PLUs erkannt: Bitte Kopfzeile „PLU“/„ZWS PLU“ setzen oder sicherstellen, dass eine Spalte durchgehend PLU-Nummern enthält.',
    )
  }

  const plu = lines.map((l) => l.excelPlu)
  return { plu, lines, skippedRows }
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
  plu: string[]
  lines: ParsedObstWerbungLine[]
  fileName: string
  totalRows: number
  skippedRows: number
}

/**
 * Führt mehrere Parser-Ergebnisse zusammen (z. B. Stück- und Gewichtsliste).
 * PLU-Dedupe über Dateien: erste Zeile mit Hinweis gewinnt.
 */
export function mergeObstWerbungParseResults(results: ObstWerbungPluExcelParseResult[]): ObstWerbungPluExcelParseResult {
  if (results.length === 0) {
    return { plu: [], lines: [], fileName: '', totalRows: 0, skippedRows: 0 }
  }
  const seen = new Set<string>()
  const lines: ParsedObstWerbungLine[] = []
  const plu: string[] = []
  let skippedRows = 0
  let totalRows = 0
  const names: string[] = []
  for (const r of results) {
    skippedRows += r.skippedRows
    totalRows += r.totalRows
    names.push(r.fileName)
    for (const line of r.lines) {
      if (seen.has(line.excelPlu)) continue
      seen.add(line.excelPlu)
      lines.push(line)
      plu.push(line.excelPlu)
    }
  }
  return {
    plu,
    lines,
    skippedRows,
    totalRows,
    fileName: names.join(' + '),
  }
}

/**
 * Liest eine Excel-Datei und sammelt PLUs inkl. Zeilen für Review (Kopfzeile oder Inferenz).
 */
export async function parseObstWerbungPluExcel(file: File): Promise<ObstWerbungPluExcelParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)
    const { plu, lines, skippedRows } = extractPluListFromObstWerbungRows(rawRows)
    return {
      plu,
      lines,
      fileName: file.name,
      totalRows: rawRows.length,
      skippedRows,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}
