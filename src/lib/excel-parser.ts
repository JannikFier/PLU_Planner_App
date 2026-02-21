// Excel-Parser: Liest PLU-Daten aus Excel-Dateien (client-seitig mit xlsx)

import * as XLSX from 'xlsx'
import type {
  ParsedPLURow,
  ExcelParseResult,
  ItemType,
  ParsedCustomProductRow,
  CustomProductParseResult,
  ParsedOfferItemRow,
  OfferItemsParseResult,
} from '@/types/plu'

/** Regex für gültige PLU: genau 5 Ziffern */
const PLU_REGEX = /^\d{5}$/

/** Erkennt den Item-Typ aus dem Dateinamen */
export function detectItemType(fileName: string): ItemType | null {
  const lower = fileName.toLowerCase()
  if (lower.includes('stueck') || lower.includes('stück')) return 'PIECE'
  if (lower.includes('gewicht')) return 'WEIGHT'
  return null
}

/** Extrahiert die KW-Nummer aus dem Dateinamen (z.B. "KW7" -> 7) */
export function detectKWFromFileName(fileName: string): number | null {
  const match = fileName.match(/kw\s*(\d{1,2})/i)
  if (match) return parseInt(match[1], 10)
  return null
}

/**
 * Erkennt den Listentyp aus einer Header-/Bezeichnungszeile (z.B. erste Zeile der Excel).
 * Sucht in allen Zellen nach "Gewicht" -> WEIGHT, "Stück" / "Stück ÜO" etc. -> PIECE.
 */
export function detectItemTypeFromHeaderRow(cells: string[]): ItemType | null {
  const joined = cells.join(' ').toLowerCase()
  // Gewicht hat Vorrang, falls beide vorkommen (unüblich)
  if (joined.includes('gewicht')) return 'WEIGHT'
  if (joined.includes('stück') || joined.includes('stueck') || joined.includes('stück üo') || joined.includes('stueck ueo')) return 'PIECE'
  return null
}

/** Prüft ob eine Zeile eine Header-Zeile ist (enthält "PLU" oder "Spalte") */
function isHeaderRow(cells: unknown[]): boolean {
  return cells.some(
    (cell) =>
      typeof cell === 'string' &&
      (cell.toUpperCase().includes('PLU') || cell.toUpperCase().includes('SPALTE'))
  )
}

/** Prüft ob ein Text ein Kategorie-Header ist (ALL-CAPS, kein PLU) */
function isCategoryHeader(text: string): boolean {
  if (!text || text.length < 2) return false
  // ALL-CAPS und mindestens 2 Buchstaben
  const letters = text.replace(/[^a-zA-ZäöüÄÖÜß]/g, '')
  return letters.length >= 2 && text === text.toUpperCase()
}

/**
 * Parst eine Excel-Datei und extrahiert PLU-Daten.
 *
 * Regeln:
 * - Typ + KW werden aus dem Dateinamen erkannt
 * - Header-Zeilen werden übersprungen
 * - Kategorie-Header (ALL-CAPS ohne PLU) werden als Warengruppe gemerkt
 * - PLU muss genau 5 Ziffern haben
 * - Duplikate: erstes Vorkommen gewinnt
 */
export function parseExcelFile(file: File): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Erstes Sheet nehmen
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel-Datei enthält keine Sheets'))
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        })

        // Dateiname analysieren
        const itemTypeFromFileName = detectItemType(file.name)
        const kwNummer = detectKWFromFileName(file.name)

        // Listentyp aus erster nicht-leerer Zeile (Header/Bezeichnung) erkennen
        let itemTypeFromContent: ItemType | null = null
        for (const rawRow of rawRows) {
          if (!rawRow || rawRow.length === 0) continue
          const cells = rawRow.map((c) => (c != null ? String(c).trim() : ''))
          const hasContent = cells.some((c) => c.length > 0)
          if (hasContent) {
            itemTypeFromContent = detectItemTypeFromHeaderRow(cells)
            break
          }
        }
        const itemType = itemTypeFromContent ?? itemTypeFromFileName ?? 'PIECE'

        const rows: ParsedPLURow[] = []
        const seenPLUs = new Set<string>()
        let skippedRows = 0
        let currentCategory: string | null = null

        for (const rawRow of rawRows) {
          // Leere Zeilen überspringen
          if (!rawRow || rawRow.length === 0) continue

          const cells = rawRow.map((cell) =>
            cell != null ? String(cell).trim() : ''
          )

          // Header-Zeile überspringen
          if (isHeaderRow(cells)) {
            skippedRows++
            continue
          }

          // Erste Zelle prüfen
          const firstCell = cells[0] ?? ''
          const secondCell = cells[1] ?? ''

          // Kategorie-Header erkennen: Kein PLU + ALL-CAPS Text
          if (!PLU_REGEX.test(firstCell) && firstCell.length > 0) {
            if (isCategoryHeader(firstCell)) {
              currentCategory = firstCell
            }
            skippedRows++
            continue
          }

          // PLU validieren
          const plu = firstCell
          if (!PLU_REGEX.test(plu)) {
            skippedRows++
            continue
          }

          // Artikelname: zweite Zelle
          const systemName = secondCell
          if (!systemName) {
            skippedRows++
            continue
          }

          // Duplikat-Check: erstes Vorkommen gewinnt
          if (seenPLUs.has(plu)) {
            skippedRows++
            continue
          }
          seenPLUs.add(plu)

          rows.push({
            plu,
            systemName,
            category: currentCategory,
          })
        }

        resolve({
          rows,
          fileName: file.name,
          itemType: itemType ?? 'PIECE',
          kwNummer,
          totalRows: rows.length,
          skippedRows,
        })
      } catch (err) {
        reject(new Error(`Excel-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`))
      }
    }

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsArrayBuffer(file)
  })
}

// ============================================================
// Parser für eigene Produkte (custom_products)
// ============================================================

/** PLU: genau 4 oder 5 Ziffern */
const CUSTOM_PLU_REGEX = /^\d{4,5}$/

/** Prüft ob Spalte 1 ein Preis ist (Dezimalzahl mit Punkt oder Komma) */
function parsePriceFromCell(cell: string): number | null {
  const trimmed = cell.trim()
  if (!trimmed) return null
  const num = parseFloat(trimmed.replace(',', '.'))
  if (isNaN(num) || num < 0) return null
  return Math.round(num * 100) / 100
}

/**
 * Parst eine Excel-Datei für den Upload eigener Produkte.
 * Format: Spalte 1 = PLU (4–5 Ziffern) ODER Preis (Dezimalzahl); Spalte 2 = Name; Spalte 3 = optional Warengruppe oder Stück/Gewicht.
 */
export function parseCustomProductsExcel(file: File): Promise<CustomProductParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel-Datei enthält keine Sheets'))
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        })

        const rows: ParsedCustomProductRow[] = []
        let skippedRows = 0

        for (const rawRow of rawRows) {
          if (!rawRow || rawRow.length === 0) continue

          const cells = rawRow.map((cell) => (cell != null ? String(cell).trim() : ''))
          const col1 = cells[0] ?? ''
          const col2 = cells[1] ?? ''
          const col3 = (cells[2] ?? '').trim() || null

          // Header-Zeile überspringen
          if (col1.toUpperCase().includes('PLU') || col1.toUpperCase().includes('SPALTE')) {
            skippedRows++
            continue
          }

          // Name Pflicht
          if (!col2) {
            skippedRows++
            continue
          }

          // Spalte 1: PLU (4–5 Ziffern) oder Preis
          if (CUSTOM_PLU_REGEX.test(col1)) {
            rows.push({
              plu: col1,
              preis: null,
              name: col2,
              blockNameOrType: col3,
            })
            continue
          }

          const price = parsePriceFromCell(col1)
          if (price !== null) {
            rows.push({
              plu: null,
              preis: price,
              name: col2,
              blockNameOrType: col3,
            })
            continue
          }

          skippedRows++
        }

        resolve({
          rows,
          fileName: file.name,
          totalRows: rows.length,
          skippedRows,
        })
      } catch (err) {
        reject(new Error(`Excel-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`))
      }
    }

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parst eine Excel-Datei für das Ausblenden von Produkten.
 * Format: Erste Spalte = PLU (eine pro Zeile), leere Zeilen werden übersprungen.
 */
export function parseHiddenItemsExcel(file: File): Promise<{ plus: string[]; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel-Datei enthält keine Sheets'))
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        })

        const plus: string[] = []
        for (const rawRow of rawRows) {
          if (!rawRow || rawRow.length === 0) continue
          const cell = rawRow[0]
          const val = cell != null ? String(cell).trim() : ''
          if (val) plus.push(val)
        }

        resolve({ plus, fileName: file.name })
      } catch (err) {
        reject(new Error(`Excel-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`))
      }
    }

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parst eine Excel-Datei für Werbung/Angebot.
 * Format: Spalte 1 = PLU, Spalte 2 = Name (optional), Spalte 3 = Anzahl Wochen (1–4).
 */
export function parseOfferItemsExcel(file: File): Promise<OfferItemsParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          reject(new Error('Excel-Datei enthält keine Sheets'))
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        })

        const rows: ParsedOfferItemRow[] = []
        let skippedRows = 0
        for (const rawRow of rawRows) {
          if (!rawRow || rawRow.length === 0) continue
          const pluCell = rawRow[0]
          const plu = pluCell != null ? String(pluCell).trim() : ''
          if (!plu) {
            skippedRows++
            continue
          }
          const nameCell = rawRow[1]
          const name = nameCell != null ? String(nameCell).trim() : undefined
          const weeksCell = rawRow[2]
          let weeks = 1
          if (weeksCell != null && weeksCell !== '') {
            const n = typeof weeksCell === 'number' ? weeksCell : parseInt(String(weeksCell).trim(), 10)
            if (Number.isNaN(n) || n < 1 || n > 4) {
              skippedRows++
              continue
            }
            weeks = n
          }
          rows.push({ plu, name, weeks })
        }

        resolve({
          rows,
          fileName: file.name,
          totalRows: rawRows.length,
          skippedRows,
        })
      } catch (err) {
        reject(new Error(`Excel-Parsing fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`))
      }
    }

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsArrayBuffer(file)
  })
}
