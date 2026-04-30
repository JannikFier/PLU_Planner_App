// Excel-Parser: Liest PLU-Daten aus Excel-Dateien (client-seitig mit ExcelJS)

import { formatError } from '@/lib/error-messages'
import { loadExcelSheetAsRows } from '@/lib/excel-read-helper'
import { PLU_REGEX, CUSTOM_PLU_REGEX } from '@/lib/plu-helpers'
import type {
  ParsedPLURow,
  ExcelParseResult,
  ItemType,
  ParsedCustomProductRow,
  CustomProductParseResult,
  ParsedOfferItemRow,
  OfferItemsParseResult,
  ParsedExitWerbungRow,
  ExitWerbungParseResult,
} from '@/types/plu'

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
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

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
      if (!rawRow || rawRow.length === 0) continue

      const cells = rawRow.map((cell) =>
        cell != null ? String(cell).trim() : ''
      )

      if (isHeaderRow(cells)) {
        skippedRows++
        continue
      }

      const firstCell = cells[0] ?? ''
      const secondCell = cells[1] ?? ''

      if (!PLU_REGEX.test(firstCell) && firstCell.length > 0) {
        if (isCategoryHeader(firstCell)) {
          currentCategory = firstCell
        }
        skippedRows++
        continue
      }

      const plu = firstCell
      if (!PLU_REGEX.test(plu)) {
        skippedRows++
        continue
      }

      const systemName = secondCell
      if (!systemName) {
        skippedRows++
        continue
      }

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

    return {
      rows,
      fileName: file.name,
      itemType: itemType ?? 'PIECE',
      kwNummer,
      totalRows: rows.length,
      skippedRows,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}

// ============================================================
// Parser für eigene Produkte (custom_products)
// ============================================================

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
 * Format: Spalte 1 = PLU (4–5 Ziffern) ODER Preis; Spalte 2 = Name; Spalte 3 = optional Warengruppe oder Typ;
 * optional Spalte 4 = Typ, wenn Spalte 3 die Warengruppe ist.
 */
export async function parseCustomProductsExcel(file: File): Promise<CustomProductParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

    const rows: ParsedCustomProductRow[] = []
    let skippedRows = 0

    for (const rawRow of rawRows) {
      if (!rawRow || rawRow.length === 0) continue

      const cells = rawRow.map((cell) => (cell != null ? String(cell).trim() : ''))
      const col1 = cells[0] ?? ''
      const col2 = cells[1] ?? ''
      const col3 = (cells[2] ?? '').trim() || null
      const col4 = cells.length > 3 ? ((cells[3] ?? '').trim() || null) : null

      if (col1.toUpperCase().includes('PLU') || col1.toUpperCase().includes('SPALTE')) {
        skippedRows++
        continue
      }

      if (!col2) {
        skippedRows++
        continue
      }

      if (CUSTOM_PLU_REGEX.test(col1)) {
        rows.push({
          plu: col1,
          preis: null,
          name: col2,
          blockNameOrType: col3,
          typColumn: col4,
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
          typColumn: col4,
        })
        continue
      }

      skippedRows++
    }

    return {
      rows,
      fileName: file.name,
      totalRows: rows.length,
      skippedRows,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}

/**
 * Parst eine Excel-Datei für das Ausblenden von Produkten.
 * Format: Erste Spalte = PLU (eine pro Zeile), leere Zeilen werden übersprungen.
 */
export async function parseHiddenItemsExcel(file: File): Promise<{ plus: string[]; fileName: string }> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

    const plus: string[] = []
    for (const rawRow of rawRows) {
      if (!rawRow || rawRow.length === 0) continue
      const cell = rawRow[0]
      const val = cell != null ? String(cell).trim() : ''
      if (val) plus.push(val)
    }

    return { plus, fileName: file.name }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}

/**
 * Parst eine Excel-Datei für Werbung/Angebot.
 * Format: Spalte 1 = PLU, Spalte 2 = Name (optional), Spalte 3 = Anzahl Wochen (1–4).
 */
export async function parseOfferItemsExcel(file: File): Promise<OfferItemsParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

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

    return {
      rows,
      fileName: file.name,
      totalRows: rawRows.length,
      skippedRows,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}

function parseGermanCellNumber(cell: unknown): number | null {
  if (cell == null || cell === '') return null
  const s = String(cell).trim().replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

/**
 * Datum aus Excel-Zelle (DD.MM.YY / DD.MM.YYYY, ISO-Präfix oder Excel-Zahl als Tag seit 1899-12-30).
 * Rückgabe nur Datum als yyyy-MM-dd (lokal).
 */
export function parseGermanCellDateToIso(cell: unknown): string | null {
  if (cell == null || cell === '') return null
  if (cell instanceof Date) {
    const y = cell.getFullYear()
    const m = cell.getMonth() + 1
    const d = cell.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const s = String(cell).trim()
  const dm = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (dm) {
    const day = parseInt(dm[1], 10)
    const month = parseInt(dm[2], 10)
    let year = parseInt(dm[3], 10)
    if (year < 100) year += 2000
    const dt = new Date(year, month - 1, day)
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  // Excel-Serienzahl (ungefährer Bereich Mo–Fr in den 2020ern)
  if (typeof cell === 'number' && cell > 40000 && cell < 60000) {
    const utcMs = Math.round((cell - 25569) * 86400 * 1000)
    const dt = new Date(utcMs)
    if (Number.isNaN(dt.getTime())) return null
    const y = dt.getFullYear()
    const m = dt.getMonth() + 1
    const d = dt.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}

function normalizeHeaderCell(c: unknown): string {
  return String(c ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Erwerb/EK-ähnliche Spalten (flexibel), aber nicht „Akt. UVP“ */
function matchesPurchasePriceHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  if (h.includes('akt') && h.includes('uvp')) return false
  return (
    h.includes('erwerb') ||
    h === 'ek' ||
    h === 'ep' ||
    h === 'e.p' ||
    h === 'e.p.' ||
    h.includes('einkauf') ||
    h.includes('bezug') ||
    h.includes('bezugs')
  )
}

/** Listen-VK (nicht Aktions-UVP / nicht Nor. UVP): z. B. „Listen-VK“, „VK“ ohne „Akt.“ */
function matchesListVkHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  if (h.includes('nor') && h.includes('uvp')) return false
  if (h.includes('akt') && (h.includes('uvp') || h.includes('vk'))) return false
  if (h.includes('listen') && (h.includes('vk') || h.includes('uvp'))) return true
  if (h === 'vk' || h === 'uvp') return true
  return false
}

/** Listen-EK (nicht Erwerb-Spalte): nur eindeutige Header wie „Listen-EK“ */
function matchesListEkHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  return h.includes('listen') && h.includes('ek')
}

/** Exit-Standard: „Nor. WP“ = normaler Einkauf (list_ek) */
function matchesNorWpHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  return h.includes('nor') && h.includes('wp')
}

/** Exit-Standard: „Akt. WP“ = Aktions-EK (purchase_price) – nicht „Nor. WP“ */
function matchesAktWpHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  if (h.includes('nor')) return false
  return h.includes('akt') && h.includes('wp')
}

/** „Nor. UVP“ = regulärer VK-Listenpreis (list_vk), nicht „Akt. UVP“ */
function matchesNorUvpHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  return h.includes('nor') && h.includes('uvp')
}

/** Exit: „Auslieferung ab“ */
function matchesAuslieferungAbHeader(normalizedHeader: string): boolean {
  const h = normalizedHeader
  if (!h) return false
  return h.includes('auslieferung') && h.includes('ab')
}

/**
 * Exit-/Wochenwerbung-Excel: erkennt Spalten per Header (Art. Nr., Artikel, Inhalt, Akt. UVP).
 * Zusätzlich: Nor./Akt. WP (Edeka-Exit) und Nor. UVP.
 */
export async function parseExitWerbungExcel(file: File): Promise<ExitWerbungParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)
    let headerRow = -1
    let colArt = -1
    let colArtikel = -1
    let colInhalt = -1
    let colAktUvp = -1
    let colPurchase = -1
    let colAktWp = -1
    let colNorWp = -1
    let colListenVk = -1
    let colNorUvp = -1
    let colListenEk = -1
    let colAuslieferung = -1

    for (let i = 0; i < Math.min(rawRows.length, 40); i++) {
      const row = rawRows[i]
      if (!row?.length) continue
      const cells = row.map(normalizeHeaderCell)
      const a0 = cells[0] ?? ''
      if (a0.includes('art') && (a0.includes('nr') || a0.includes('nr.'))) {
        headerRow = i
        for (let j = 0; j < row.length; j++) {
          const h = cells[j] ?? ''
          if (h.includes('art') && (h.includes('nr') || h.includes('nr.'))) colArt = j
          else if (h === 'artikel' || h.startsWith('artikel')) colArtikel = j
          else if (h.includes('inhalt')) colInhalt = j
          else if (h.includes('akt') && h.includes('uvp')) colAktUvp = j
          else if (colNorWp < 0 && matchesNorWpHeader(h)) colNorWp = j
          else if (colAktWp < 0 && matchesAktWpHeader(h)) colAktWp = j
          else if (colPurchase < 0 && matchesPurchasePriceHeader(h)) colPurchase = j
        }
        const reserved = new Set(
          [colArt, colArtikel, colInhalt, colAktUvp, colPurchase, colAktWp, colNorWp].filter(
            (x) => x >= 0,
          ),
        )
        for (let j = 0; j < row.length; j++) {
          if (reserved.has(j)) continue
          const h = cells[j] ?? ''
          if (colNorUvp < 0 && matchesNorUvpHeader(h)) colNorUvp = j
          if (colListenVk < 0 && matchesListVkHeader(h)) colListenVk = j
        }
        const reserved2 = new Set(
          [...reserved, colNorUvp >= 0 ? colNorUvp : -1, colListenVk >= 0 ? colListenVk : -1].filter(
            (x) => x >= 0,
          ),
        )
        for (let j = 0; j < row.length; j++) {
          if (reserved2.has(j)) continue
          const h = cells[j] ?? ''
          if (colListenEk < 0 && matchesListEkHeader(h)) colListenEk = j
        }
        const reserved3 = new Set([...reserved2, colListenEk >= 0 ? colListenEk : -1].filter((x) => x >= 0))
        for (let j = 0; j < row.length; j++) {
          if (reserved3.has(j)) continue
          const h = cells[j] ?? ''
          if (colAuslieferung < 0 && matchesAuslieferungAbHeader(h)) colAuslieferung = j
        }
        break
      }
    }

    if (headerRow < 0 || colArt < 0 || colAktUvp < 0) {
      throw new Error(
        'Header nicht gefunden: Erwartet werden Spalten „Art. Nr.“ und „Akt. UVP“ (oder ähnlich).',
      )
    }
    if (colArtikel < 0) colArtikel = 1

    const rows: ParsedExitWerbungRow[] = []
    let skippedRows = 0
    let auslieferungAb: string | null = null

    for (let i = headerRow + 1; i < rawRows.length; i++) {
      const rawRow = rawRows[i]
      if (!rawRow || rawRow.length === 0) continue
      if (colAuslieferung >= 0 && auslieferungAb == null) {
        const iso = parseGermanCellDateToIso(rawRow[colAuslieferung])
        if (iso) auslieferungAb = iso
      }
      const artNr = rawRow[colArt] != null ? String(rawRow[colArt]).trim() : ''
      if (!artNr) {
        skippedRows++
        continue
      }
      const artikel =
        colArtikel >= 0 && rawRow[colArtikel] != null ? String(rawRow[colArtikel]).trim() : ''
      const inhalt =
        colInhalt >= 0 && rawRow[colInhalt] != null ? String(rawRow[colInhalt]).trim() : ''
      const aktUvp = parseGermanCellNumber(rawRow[colAktUvp])
      if (aktUvp == null || aktUvp < 0) {
        skippedRows++
        continue
      }
      let purchasePrice: number | null = null
      if (colAktWp >= 0) {
        const p = parseGermanCellNumber(rawRow[colAktWp])
        if (p != null && p >= 0) purchasePrice = p
      } else if (colPurchase >= 0) {
        const p = parseGermanCellNumber(rawRow[colPurchase])
        if (p != null && p >= 0) purchasePrice = p
      }
      let listVk: number | null = null
      if (colNorUvp >= 0) {
        const v = parseGermanCellNumber(rawRow[colNorUvp])
        if (v != null && v >= 0) listVk = v
      } else if (colListenVk >= 0) {
        const v = parseGermanCellNumber(rawRow[colListenVk])
        if (v != null && v >= 0) listVk = v
      }
      let listEk: number | null = null
      if (colNorWp >= 0) {
        const v = parseGermanCellNumber(rawRow[colNorWp])
        if (v != null && v >= 0) listEk = v
      } else if (colListenEk >= 0) {
        const v = parseGermanCellNumber(rawRow[colListenEk])
        if (v != null && v >= 0) listEk = v
      }
      rows.push({
        artNr,
        artikel,
        inhalt,
        aktUvp,
        purchasePrice,
        listEk,
        listVk,
        rowIndex: i + 1,
      })
    }

    return {
      rows,
      fileName: file.name,
      totalRows: rawRows.length,
      skippedRows,
      auslieferungAb,
    }
  } catch (err) {
    throw new Error(`Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}
