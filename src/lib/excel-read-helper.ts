// Zentrale Excel-Lesehilfe mit ExcelJS (ersetzt xlsx für Tabellen-Lesen)
// Liefert dasselbe Format wie früher sheet_to_json(..., { header: 1, defval: '' })
// ExcelJS wird per dynamischem import() erst beim Einlesen einer Datei geladen (kleinere initiale Chunks).

import type { Cell, CellValue, Row, Worksheet } from 'exceljs'

/**
 * Excel-Dateien können einen riesigen „Used Range“ (Formatierung bis Zeile 1M+) haben.
 * `sheet.eachRow({ includeEmpty: true })` iteriert dann bis `_rows.length` und ruft für jede Zeile
 * `getRow(i)` auf → extrem langsam / Browser wirkt eingefroren.
 */
const LOAD_EXCEL_MAX_ROWS = 25_000

/** Werbe-/PLU-Listen: relevante Spalten sind vorn; nicht `eachCell` über ggf. riesiges `_cells`. */
const LOAD_EXCEL_MAX_COLS = 96

/**
 * ExcelJS `cell.value` kann viele Formen haben (string, number, Date, Formel-Objekt,
 * RichText-Objekt, Hyperlink, Error). Ein stringifiziertes `{ formula: '...', result: 42 }`
 * würde sonst als `"[object Object]"` in Parser und Dialog-Vorschau landen. Daher hier zentral robust machen.
 */
function normalizeCellValue(value: CellValue): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'object') return String(value)

  const obj = value as unknown as Record<string, unknown>
  // Rich text: { richText: [{ text: '...' }, ...] }
  if (Array.isArray(obj.richText)) {
    return (obj.richText as Array<{ text?: unknown }>)
      .map((part) => String(part?.text ?? ''))
      .join('')
  }
  // Formel / Shared-Formel: { formula|sharedFormula, result, ... } – Ergebnis bevorzugen
  if ('result' in obj && obj.result != null) {
    return normalizeCellValue(obj.result as CellValue)
  }
  // Hyperlink: { hyperlink, text }
  if (typeof obj.text === 'string') return obj.text
  if ('text' in obj) return String(obj.text ?? '')
  // Error-Zellen
  if (typeof obj.error === 'string') return obj.error
  // Fallback: Bild-/Objekt-Zellen kommen oft als leeres Objekt → leerer String statt "[object Object]"
  return ''
}

/**
 * Liest den Anzeige-Inhalt einer Excel-Zelle robust aus.
 * - Gemergte Zellen: Wert steht oft nur in der Master-Zelle (Nachbarzellen sonst leer).
 * - Formeln: falls `value` kein Ergebnis liefert, ExcelJS-Getter `result` nutzen.
 * - Barcode-/Sonderdarstellung: Fallback auf `cell.text`, wenn `value` leer bleibt.
 */
function cellToReadableString(cell: Cell): string {
  const model = cell.master
  let s = normalizeCellValue(model.value)
  if (!s) {
    const res = model.result
    if (res !== undefined && res !== null) {
      s = normalizeCellValue(res as CellValue)
    }
  }
  if (!s && typeof model.text === 'string') {
    const t = model.text.trim()
    if (t) s = t
  }
  return s
}

/**
 * Eine Datenzeile wie bisher: leere Zellen zwischen belegten Spalten als ''.
 * Nur Spalten 1…LOAD_EXCEL_MAX_COLS per `findCell` (legt keine neuen Zellen an).
 * `eachCell`/`forEach` über `_cells` kann bei sehr breiten Zeilen weiter extrem langsam sein.
 */
function rowToCellValues(row: Row): unknown[] {
  const cellValues: unknown[] = []
  let maxCol = 0
  for (let col = 1; col <= LOAD_EXCEL_MAX_COLS; col++) {
    const cell = row.findCell(col)
    if (!cell) continue
    const idx = col - 1
    cellValues[idx] = cellToReadableString(cell)
    maxCol = col
  }
  if (maxCol === 0) return []
  for (let c = 0; c < maxCol; c++) {
    if (cellValues[c] === undefined) cellValues[c] = ''
  }
  return cellValues
}

/** ExcelJS speichert Merges unter `_merges` (Range mit top/left/bottom/right, 1-basiert). */
type WorksheetMerges = Record<string, { top: number; left: number; bottom: number; right: number }>

/**
 * Verteilt den Inhalt der Master-Zelle (oben links) auf alle Zellen des Merge-Rechtecks.
 * Ohne diesen Schritt fehlen in `findCell`-Zeilen oft Slave-Spalten (kein `<c>` in der xlsx) –
 * typisch bei horizontal gemergten Namens-Zellen (z. B. Z:AA), dann findet der Kassenblatt-Parser keinen Namen.
 * Nur leere Zielzellen werden befüllt, damit echte Nachbar-Inhalte nicht überschrieben werden.
 */
function applyWorksheetMergesToRows(sheet: Worksheet, rows: string[][]): void {
  const merges = (sheet as unknown as { _merges?: WorksheetMerges })._merges
  if (!merges || typeof merges !== 'object') return

  for (const dimensions of Object.values(merges)) {
    if (!dimensions) continue
    const { top, left, bottom, right } = dimensions as {
      top: number
      left: number
      bottom: number
      right: number
    }
    if (top < 1 || left < 1 || bottom < top || right < left) continue

    const masterRi = top - 1
    const masterCi = left - 1
    while (rows.length <= masterRi) rows.push([])
    const masterRow = rows[masterRi]!
    while (masterRow.length <= masterCi) masterRow.push('')
    const masterVal = String(masterRow[masterCi] ?? '').trim()
    if (!masterVal) continue

    const maxColBound = Math.min(right, LOAD_EXCEL_MAX_COLS)
    for (let r = top; r <= bottom; r++) {
      const ri = r - 1
      if (ri < 0 || ri >= LOAD_EXCEL_MAX_ROWS) break
      while (rows.length <= ri) rows.push([])
      const row = rows[ri]!
      for (let c = left; c <= maxColBound; c++) {
        const ci = c - 1
        while (row.length <= ci) row.push('')
        const cur = String(row[ci] ?? '').trim()
        if (cur === '') {
          row[ci] = masterVal
        }
      }
    }
  }
}

/**
 * Liest eine Excel-Datei und liefert das erste Sheet als Array von Zeilen (jede Zeile = Array von Zellen).
 * Leere Zellen werden als '' geliefert. Kompatibel mit der bisherigen xlsx-basierten Parser-Logik.
 */
export async function loadExcelSheetAsRows(file: File): Promise<unknown[][]> {
  const { default: ExcelJS } = await import('exceljs')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer as never)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Excel-Datei enthält keine Sheets')
  }

  const declaredLast = sheet.rowCount
  const lastRow = Math.min(Math.max(declaredLast, 0), LOAD_EXCEL_MAX_ROWS)
  const rows: string[][] = []
  for (let r = 1; r <= lastRow; r++) {
    const row = sheet.findRow(r)
    if (!row) {
      rows.push([])
      continue
    }
    rows.push(rowToCellValues(row) as string[])
  }

  applyWorksheetMergesToRows(sheet, rows)

  return rows
}
