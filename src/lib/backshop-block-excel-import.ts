import { formatError } from '@/lib/error-messages'
import { loadExcelSheetAsRows } from '@/lib/excel-read-helper'

export interface BackshopBlockExcelEntry {
  blockName: string
  productName: string
}

export interface BackshopBlockExcelParseResult {
  blocksFromExcel: { name: string; columnIndex: number }[]
  entries: BackshopBlockExcelEntry[]
  fileName: string
}

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

/**
 * Liest eine Excel-Tabelle im Format:
 * - Erste Zeile: Warengruppen-Namen (Spaltenüberschriften)
 * - Darunter: Produktnamen (eine Zelle pro Produkt); leere Zeilen am Ende werden ignoriert.
 */
export async function parseBackshopBlockExcel(file: File): Promise<BackshopBlockExcelParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

    if (rawRows.length === 0) {
      return { blocksFromExcel: [], entries: [], fileName: file.name }
    }

    const headerRow = rawRows[0] ?? []
    const blocksFromExcel: { name: string; columnIndex: number }[] = []

    for (let c = 0; c < headerRow.length; c++) {
      const name = normalizeCell(headerRow[c])
      if (!name) continue
      blocksFromExcel.push({ name, columnIndex: c })
    }

    const entries: BackshopBlockExcelEntry[] = []

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r] ?? []
      const hasAnyValue = row.some((cell) => normalizeCell(cell).length > 0)
      if (!hasAnyValue) {
        break
      }
      for (const block of blocksFromExcel) {
        const cell = normalizeCell(row[block.columnIndex])
        if (!cell) continue
        entries.push({
          blockName: block.name,
          productName: cell,
        })
      }
    }

    return {
      blocksFromExcel,
      entries,
      fileName: file.name,
    }
  } catch (err) {
    throw new Error(`Backshop-Warengruppen-Excel konnte nicht gelesen werden: ${formatError(err)}`)
  }
}

