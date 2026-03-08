// Zentrale Excel-Lesehilfe mit ExcelJS (ersetzt xlsx für Tabellen-Lesen)
// Liefert dasselbe Format wie früher sheet_to_json(..., { header: 1, defval: '' })

import ExcelJS from 'exceljs'

/**
 * Liest eine Excel-Datei und liefert das erste Sheet als Array von Zeilen (jede Zeile = Array von Zellen).
 * Leere Zellen werden als '' geliefert. Kompatibel mit der bisherigen xlsx-basierten Parser-Logik.
 */
export async function loadExcelSheetAsRows(file: File): Promise<unknown[][]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer as never)

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw new Error('Excel-Datei enthält keine Sheets')
  }

  const rows: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row) => {
    let maxCol = 0
    const cellValues: unknown[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value
      const normalized = value == null ? '' : (typeof value === 'object' && value !== null && 'text' in value
        ? String((value as { text: string }).text)
        : String(value))
      const idx = colNumber - 1
      cellValues[idx] = normalized
      if (idx >= maxCol) maxCol = idx + 1
    })
    for (let c = 0; c < maxCol; c++) {
      if (cellValues[c] === undefined) cellValues[c] = ''
    }
    rows.push(cellValues)
  })

  return rows
}
