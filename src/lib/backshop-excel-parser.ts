// Backshop-Excel-Parser: PLU, Name (Warentext), Abbildung
// Intelligente Spalten-Erkennung; Namens-Bereinigung: nur Teil bis erstes Komma

import { formatError } from '@/lib/error-messages'
import { truncateSkippedCellRaw } from '@/lib/backshop-upload-analysis'
import { loadExcelSheetAsRows } from '@/lib/excel-read-helper'
import { PLU_REGEX } from '@/lib/plu-helpers'
import type {
  ParsedBackshopRow,
  BackshopParseResult,
  BackshopSkippedReasons,
  BackshopSkippedDetails,
  SameNameDifferentPluEntry,
} from '@/types/plu'

/** Ermittelt „Gleiche Bezeichnung, verschiedene PLU“ aus geparsten Zeilen (mit pluSheetRow/pluSheetCol). */
function computeSameNameDifferentPlu(rows: ParsedBackshopRow[]): SameNameDifferentPluEntry[] {
  const byName = new Map<string, { plu: string; row: number; col: number }[]>()
  for (const r of rows) {
    if (r.pluSheetRow == null || r.pluSheetCol == null) continue
    const list = byName.get(r.systemName) ?? []
    list.push({ plu: r.plu, row: r.pluSheetRow, col: r.pluSheetCol })
    byName.set(r.systemName, list)
  }
  const out: SameNameDifferentPluEntry[] = []
  for (const [name, occ] of byName) {
    if (occ.length < 2) continue
    const distinctPlus = new Set(occ.map((o) => o.plu))
    if (distinctPlus.size > 1) out.push({ name, occurrences: occ })
  }
  return out
}

/** Normalisiert PLU auf 5 Stellen: Excel liefert oft Zahlen ohne führende Nullen (z. B. 8304), oder *81597*. */
function normalizePLU(raw: string): string {
  const cleaned = raw.replace(/\*/g, '').trim()
  if (/^\d{1,5}$/.test(cleaned)) return cleaned.padStart(5, '0')
  return cleaned
}

/** Prüft, ob eine Rohzelle (vor Normalisierung) direkt eine 5-stellige Zahl enthält – ohne führende Nullen ergänzen zu müssen. */
function isRawFiveDigitPlu(raw: string): boolean {
  const cleaned = raw.replace(/\*/g, '').trim()
  return /^\d{5}$/.test(cleaned)
}

/** Nimmt nur den Teil bis zum ersten Komma; reduziert Mehrfach-Leerzeichen auf eines (z. B. „Berliner    Eierlikör“ → „Berliner Eierlikör“). */
export function backshopNameCleanup(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  const commaIndex = trimmed.indexOf(',')
  const namePart = commaIndex === -1 ? trimmed : trimmed.slice(0, commaIndex).trim()
  return namePart.replace(/\s+/g, ' ').trim()
}

/**
 * Prüft, ob eine Zelle wie ein Header wirkt (PLU, Spalte, Warentext, etc.).
 * Nutzt Wortgrenzen (\b), damit Produktnamen wie „Plunder“, „Bildschnitte“ oder
 * „Kunst“ nicht fälschlich als Header erkannt werden (Regression 16.02.2026).
 */
export function isHeaderLike(cell: string): boolean {
  const u = cell.toUpperCase().trim()
  if (!u) return false
  // Einzelne Header-Stichwörter, jeweils als eigenständiges Wort
  if (/\b(PLU|ZWS|SPALTE|WARENTEXT|WAARENTEXT|WAAGENTEXT|ETIKETTENTEXT|ABBILDUNG|BILD|BEZEICHNUNG|ARTIKELBEZEICHNUNG|LIEFERANT|SAP)\b/.test(u)) {
    return true
  }
  // Kombi: „Artikel-Nr.“ / „Art. Nr.“ – beide Teile müssen als eigenständige Wörter vorkommen
  if (/\bARTIKEL\b/.test(u) && /\bNR\b/.test(u)) return true
  if (/\bART\b/.test(u) && /\bNR\b/.test(u)) return true
  return false
}

/** Findet die Spaltenindizes für PLU, Name und ggf. Abbildung aus einer Zeile und ein paar Datenzeilen. */
function detectColumns(
  rawRows: string[][],
  headerRowIndex: number
): { pluCol: number; nameCol: number; imageCol: number } {
  const headerRow = rawRows[headerRowIndex] ?? []
  const maxCol = Math.max(headerRow.length, ...rawRows.slice(headerRowIndex + 1, headerRowIndex + 20).map((r) => r.length))

  let pluCol = -1
  let nameCol = -1
  let imageCol = -1

  // PLU-Heuristik: Bewertung aller Kandidatenspalten, beste gewinnt.
  // Ziel: ZWS-PLU (5-stellig) bevorzugen gegenüber interner 4-stelliger Hausnummer,
  // auch wenn beide nach normalizePLU gültige 5-Steller liefern.
  {
    const SCAN_ROWS = Math.min(15, Math.max(1, rawRows.length - headerRowIndex - 1))
    let bestScore = -1
    let bestCol = -1
    for (let c = 0; c < maxCol; c++) {
      const headerCell = (headerRow[c] ?? '').trim().toUpperCase()
      let rawFive = 0 // bereits 5-stellig in der Excel (starkes Signal)
      let padded = 0 // durch Padding auf 5 gebracht (schwaches Signal)
      let invalid = 0
      let scanned = 0
      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 1 + SCAN_ROWS, rawRows.length); r++) {
        const cell = String(rawRows[r]?.[c] ?? '').trim()
        if (!cell) continue
        scanned++
        if (isRawFiveDigitPlu(cell)) {
          rawFive++
          continue
        }
        const normalized = normalizePLU(cell)
        if (PLU_REGEX.test(normalized)) padded++
        else invalid++
      }
      if (scanned === 0) continue
      const valid = rawFive + padded
      if (valid === 0) continue
      let score = 0
      // ZWS-PLU-Header schlägt alles
      if (headerCell.includes('ZWS') && headerCell.includes('PLU')) score += 1000
      // Reiner PLU-Header (kurz) ist noch gut
      else if (headerCell.includes('PLU') && headerCell.length <= 10) score += 200
      // Bonus für rohe 5-stellige Werte (echte ZWS-PLU) – pro Zeile stärker als Padding
      score += rawFive * 10
      score += padded * 1
      score -= invalid * 5
      if (score > bestScore) {
        bestScore = score
        bestCol = c
      }
    }
    if (bestCol >= 0) pluCol = bestCol
  }

  // Name + Bild per Header
  for (let c = 0; c < maxCol; c++) {
    const headerCell = (headerRow[c] ?? '').trim().toUpperCase()
    if (headerCell.includes('WARENTEXT') || headerCell.includes('WAARENTEXT') || headerCell.includes('WAAGENTEXT') || headerCell.includes('ETIKETTENTEXT')) nameCol = c
    if (headerCell.includes('ABBILDUNG') || headerCell.includes('BILD')) imageCol = imageCol === -1 ? c : imageCol
  }

  // Fallback: Spalte, in der (nach Normalisierung) nur 5-stellige PLUs stehen
  if (pluCol === -1) {
    for (let c = 0; c < maxCol; c++) {
      let allValid = true
      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 15, rawRows.length); r++) {
        const cell = String(rawRows[r]?.[c] ?? '').trim()
        if (!cell) continue
        const normalized = normalizePLU(cell)
        if (!PLU_REGEX.test(normalized)) {
          allValid = false
          break
        }
      }
      if (allValid) {
        pluCol = c
        break
      }
    }
  }

  // Fallback Name: längste durchschnittliche Textspalte oder Spalte mit "Name"-ähnlichem Header
  if (nameCol === -1) {
    for (let c = 0; c < maxCol; c++) {
      const h = (headerRow[c] ?? '').toLowerCase()
      if (h.includes('name') || h.includes('text') || h.includes('bezeichnung')) {
        nameCol = c
        break
      }
    }
  }
  if (nameCol === -1) {
    let maxAvg = 0
    for (let c = 0; c < maxCol; c++) {
      let sum = 0
      let count = 0
      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 50, rawRows.length); r++) {
        const cell = String(rawRows[r]?.[c] ?? '').trim()
        if (cell.length > 0) {
          sum += cell.length
          count++
        }
      }
      const avg = count > 0 ? sum / count : 0
      if (avg > maxAvg && count >= 3) {
        maxAvg = avg
        nameCol = c
      }
    }
  }

  return { pluCol: pluCol >= 0 ? pluCol : 0, nameCol: nameCol >= 0 ? nameCol : 1, imageCol: imageCol >= 0 ? imageCol : -1 }
}

/**
 * Erkennt "Spalten-Layout": ein Produkt pro Spalte, Zeile 0 = Namen, Zeile 1 oder 2 = PLU, Zeile 3 = Bild,
 * alle 4–5 Zeilen ein Block, dazwischen Leerzeilen. Kein Header wie "PLU" / "WARENTEXT" in den ersten Zeilen.
 * Wenn in einer der ersten 10 Zeilen eine Header-Zelle vorkommt → Zeilen-Layout (eine Zeile = ein Produkt).
 */
function detectColumnBasedLayout(rowsStr: string[][]): boolean {
  if (rowsStr.length < 4) return false
  // Header-Zellen in den ersten 20 Zeilen → kein reines Block-Layout.
  // isHeaderLike nutzt seit 16.02.2026 Wortgrenzen, damit „Plunder“ o.ä. nicht fälschlich triggern.
  for (let r = 0; r < Math.min(20, rowsStr.length); r++) {
    const row = rowsStr[r] ?? []
    if (row.some((cell) => isHeaderLike(cell))) return false
  }
  const row0 = rowsStr[0] ?? []
  let columnsWithPlu = 0
  const maxCol = Math.min(row0.length, 50)
  for (let c = 0; c < maxCol; c++) {
    const plu1 = String(rowsStr[1]?.[c] ?? '').trim()
    const plu2 = String(rowsStr[2]?.[c] ?? '').trim()
    const normalized = normalizePLU(plu1) || normalizePLU(plu2)
    if (PLU_REGEX.test(normalized)) columnsWithPlu++
  }
  // Mindestens 3 Spalten mit 5-stelliger PLU, damit ein zufälliges Nummernpaar nicht fälschlich Block-Modus aktiviert.
  return columnsWithPlu >= 3
}

/**
 * Parst ein Blatt im Spalten-Layout: pro Spalte ein Produkt, Blöcke (Name-/PLU-/Bild-Zeilen) durch Leerzeilen getrennt.
 */
function parseColumnBasedLayout(rowsStr: string[][]): {
  rows: ParsedBackshopRow[]
  skippedRows: number
  skippedReasons: BackshopSkippedReasons
  skippedDetails: BackshopSkippedDetails
} {
  const seenPLUs = new Set<string>()
  const firstOccurrence = new Map<string, { row: number; col: number }>()
  const rows: ParsedBackshopRow[] = []
  const skippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
  const skippedDetails: BackshopSkippedDetails = {
    invalidPlu: [],
    emptyName: [],
    duplicatePlu: [],
  }
  const blockSize = 5
  for (let start = 0; start + 3 < rowsStr.length; start += blockSize) {
    const nameRow = rowsStr[start] ?? []
    const pluRow1 = rowsStr[start + 1] ?? []
    const pluRow2 = rowsStr[start + 2] ?? []
    const hasAnyName = nameRow.some((c) => String(c).trim().length > 0)
    if (!hasAnyName) continue
    const maxCol = Math.max(nameRow.length, pluRow1.length, pluRow2.length)
    for (let c = 0; c < maxCol; c++) {
      const nameRaw = String(nameRow[c] ?? '').trim()
      const systemName = backshopNameCleanup(nameRaw)
      const pluRaw = String(pluRow1[c] ?? pluRow2[c] ?? '').trim()
      const plu = normalizePLU(pluRaw)
      if (!PLU_REGEX.test(plu)) {
        if (nameRaw || pluRaw) {
          skippedReasons.invalidPlu++
          skippedDetails.invalidPlu.push({
            row: start + 2,
            col: c + 1,
            rawCell: truncateSkippedCellRaw(pluRaw),
          })
        }
        continue
      }
      if (!systemName || /^\*+$/.test(systemName)) {
        skippedReasons.emptyName++
        skippedDetails.emptyName.push({ row: start + 1, col: c + 1 })
        continue
      }
      if (seenPLUs.has(plu)) {
        skippedReasons.duplicatePlu++
        const first = firstOccurrence.get(plu)
        skippedDetails.duplicatePlu.push({
          row: start + 2,
          col: c + 1,
          plu,
          firstRow: first?.row ?? start + 2,
          firstCol: first?.col ?? c + 1,
          orphanImageSheetRow0: start + 3,
          orphanImageSheetCol0: c,
        })
        continue
      }
      seenPLUs.add(plu)
      firstOccurrence.set(plu, { row: start + 2, col: c + 1 })
      rows.push({
        plu,
        systemName,
        imageColumnIndex: 3,
        imageUrl: null,
        imageSheetRow0: start + 3,
        imageSheetCol0: c,
      })
    }
  }
  const skippedRows =
    skippedReasons.invalidPlu + skippedReasons.emptyName + skippedReasons.duplicatePlu
  return { rows, skippedRows, skippedReasons, skippedDetails }
}

/**
 * Kassenblatt-Layout: pro Spalte ein Produkt; Zeile N = Namen, N+1 = PLUs, optional N+2 = Bild.
 * Mehrere Bänder möglich (z. B. Zeilen 0–2, 3–5, 6–8 … bis Zeile 24, Spalten bis AR).
 * Es werden alle 3-Zeilen-Blöcke durchgegangen, nicht nur das erste.
 */
function parseKassenblattColumnLayout(rowsStr: string[][]): {
  rows: ParsedBackshopRow[]
  skippedReasons: BackshopSkippedReasons
  skippedDetails: BackshopSkippedDetails
  nameRowIndex: number
} {
  const seenPLUs = new Set<string>()
  /** Erstes Vorkommen pro PLU (1-basierte Zeile/Spalte), damit Duplikate mit „erstes Mal … doppelt …“ angezeigt werden. */
  const firstOccurrence = new Map<string, { row: number; col: number }>()
  const rows: ParsedBackshopRow[] = []
  const skippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
  const skippedDetails: BackshopSkippedDetails = {
    invalidPlu: [],
    emptyName: [],
    duplicatePlu: [],
  }

  /** Alle Bänder finden: Startzeilen N, sodass (N, N+1) mind. 3 PLUs und 3 Namen hat. Mind. 3 Zeilen Abstand zwischen Bändern. */
  const candidates: number[] = []
  const maxScan = Math.min(rowsStr.length - 1, 120)
  for (let start = 0; start < maxScan; start++) {
    if (start + 1 >= rowsStr.length) break
    const nameRow = rowsStr[start] ?? []
    const pluRow = rowsStr[start + 1] ?? []
    const maxCol = Math.min(Math.max(nameRow.length, pluRow.length), 200)
    let pluCount = 0
    let nameNotPluCount = 0
    for (let c = 0; c < maxCol; c++) {
      const pluRaw = String(pluRow[c] ?? '').trim()
      if (PLU_REGEX.test(normalizePLU(pluRaw))) pluCount++
      const nameCell = String(nameRow[c] ?? '').trim()
      if (nameCell && !PLU_REGEX.test(normalizePLU(nameCell))) nameNotPluCount++
    }
    if (pluCount >= 3 && nameNotPluCount >= 3) candidates.push(start)
  }
  const bandStarts: number[] = []
  for (const n of candidates) {
    if (bandStarts.length === 0 || n >= (bandStarts[bandStarts.length - 1] ?? 0) + 3) bandStarts.push(n)
  }

  /** Fallback: wie bisher nur ein Band, wenn keine 3er-Blöcke gefunden (z. B. nur Zeilen 5–6). */
  if (bandStarts.length === 0) {
    let bestNameRowIndex = 0
    let bestCount = 0
    for (let nameRowIndex = 0; nameRowIndex < Math.min(20, rowsStr.length - 1); nameRowIndex++) {
      const nameRow = rowsStr[nameRowIndex] ?? []
      const pluRow = rowsStr[nameRowIndex + 1] ?? []
      const maxCol = Math.min(Math.max(nameRow.length, pluRow.length), 200)
      let pluCount = 0
      let nameNotPluCount = 0
      for (let c = 0; c < maxCol; c++) {
        const pluRaw = String(pluRow[c] ?? '').trim()
        if (PLU_REGEX.test(normalizePLU(pluRaw))) pluCount++
        const nameCell = String(nameRow[c] ?? '').trim()
        if (nameCell && !PLU_REGEX.test(normalizePLU(nameCell))) nameNotPluCount++
      }
      if (pluCount >= 3 && nameNotPluCount >= 3 && pluCount > bestCount) {
        bestCount = pluCount
        bestNameRowIndex = nameRowIndex
      }
    }
    bandStarts.push(bestNameRowIndex)
  }

  const firstBandStart = bandStarts[0] ?? 0

  for (const nameRowIndex of bandStarts) {
    const nameRow = rowsStr[nameRowIndex] ?? []
    const pluRow = rowsStr[nameRowIndex + 1] ?? []
    const maxCol = Math.max(nameRow.length, pluRow.length)

    // Kassenblätter haben oft eine *PLU*-Formelzeile (z.B. *81593*) zwischen PLU-Zeile und Bild-Zeile.
    // Erkennung: Wenn ≥3 Zellen in Zeile N+2 nach normalizePLU gültige PLUs sind, ist es eine Formelzeile → Bilder bei N+3.
    const candidateFormulaRow = rowsStr[nameRowIndex + 2] ?? []
    const formulaCellsLikePlu = candidateFormulaRow.filter((cell) => {
      const raw = String(cell).trim()
      return raw.length > 0 && PLU_REGEX.test(normalizePLU(raw))
    }).length
    const hasFormulaRow = formulaCellsLikePlu >= 3
    const imageRowOffset = hasFormulaRow ? 3 : 2
    const imageRowIndex = nameRowIndex + imageRowOffset
    const hasImageRow = imageRowIndex < rowsStr.length

    for (let c = 0; c < maxCol; c++) {
      const nameRaw = String(nameRow[c] ?? '').trim()
      const systemName = backshopNameCleanup(nameRaw)
      const pluRaw = String(pluRow[c] ?? '').trim()
      const plu = normalizePLU(pluRaw)
      if (!PLU_REGEX.test(plu)) {
        if (nameRaw || pluRaw) {
          skippedReasons.invalidPlu++
          skippedDetails.invalidPlu.push({
            row: nameRowIndex + 2,
            col: c + 1,
            rawCell: truncateSkippedCellRaw(pluRaw),
          })
        }
        continue
      }
      if (!systemName || /^\*+$/.test(systemName)) {
        skippedReasons.emptyName++
        skippedDetails.emptyName.push({ row: nameRowIndex + 1, col: c + 1 })
        continue
      }
      if (seenPLUs.has(plu)) {
        skippedReasons.duplicatePlu++
        const first = firstOccurrence.get(plu)
        skippedDetails.duplicatePlu.push({
          row: nameRowIndex + 2,
          col: c + 1,
          plu,
          firstRow: first?.row ?? nameRowIndex + 2,
          firstCol: first?.col ?? c + 1,
          ...(hasImageRow && {
            orphanImageSheetRow0: imageRowIndex,
            orphanImageSheetCol0: c,
          }),
        })
        continue
      }
      seenPLUs.add(plu)
      firstOccurrence.set(plu, { row: nameRowIndex + 2, col: c + 1 })
      rows.push({
        plu,
        systemName,
        imageColumnIndex: hasImageRow ? 0 : -1,
        imageUrl: null,
        pluSheetRow: nameRowIndex + 2,
        pluSheetCol: c + 1,
        ...(hasImageRow && {
          imageSheetRow0: imageRowIndex,
          imageSheetCol0: c,
        }),
      })
    }
  }

  return {
    rows,
    skippedReasons,
    skippedDetails,
    nameRowIndex: firstBandStart,
  }
}

/**
 * Parst eine Backshop-Excel-Datei.
 * - PLU: 5-stellig (Spalte wird erkannt)
 * - Name: Warentext/Etikettentext, nur Teil bis erstes Komma
 * - Abbildung: Spalte wird erkannt; Bild-URL wird hier nicht aus Excel gelesen (kommt nach Upload in Storage)
 */
export async function parseBackshopExcelFile(file: File): Promise<BackshopParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)

    const rowsStr: string[][] = rawRows.map((row) =>
          (row as unknown[]).map((cell) => (cell != null ? String(cell).trim() : ''))
        )

        // Layout „ein Produkt pro Spalte“ (Name Zeile 0, PLU Zeile 1/2, Bild Zeile 3, Blöcke mit Leerzeilen)
        if (detectColumnBasedLayout(rowsStr)) {
          const colResult = parseColumnBasedLayout(rowsStr)
          const { rows: colRows, skippedRows: colSkipped } = colResult
          // Fallback: Bei sehr vielen Überspringungen (z. B. Lagerordersatz-Export) Zeilen-Layout versuchen
          const tryRowBasedFallback = colSkipped > 10 * Math.max(1, colRows.length)
          if (tryRowBasedFallback) {
            let headerRowIndex = 0
            for (let r = 0; r < Math.min(25, rowsStr.length); r++) {
              const row = rowsStr[r] ?? []
              if (row.some((cell) => isHeaderLike(cell))) {
                headerRowIndex = r
                break
              }
            }
            const { pluCol, nameCol, imageCol } = detectColumns(rowsStr, headerRowIndex)
            const seenPLUs = new Set<string>()
            const rowFirstOccurrence = new Map<string, { row: number; col: number }>()
            const rowRows: ParsedBackshopRow[] = []
            const rowSkippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
            const rowSkippedDetails: BackshopSkippedDetails = {
              invalidPlu: [],
              emptyName: [],
              duplicatePlu: [],
            }
            for (let r = headerRowIndex + 1; r < rowsStr.length; r++) {
              const excelRow1Based = r + 1
              const cells = rowsStr[r] ?? []
              const pluRaw = String(cells[pluCol] ?? '').trim()
              const plu = normalizePLU(pluRaw)
              if (!PLU_REGEX.test(plu)) {
                rowSkippedReasons.invalidPlu++
                rowSkippedDetails.invalidPlu.push({
                  row: excelRow1Based,
                  col: pluCol + 1,
                  rawCell: truncateSkippedCellRaw(pluRaw),
                })
                continue
              }
              const nameRaw = (cells[nameCol] ?? '').trim()
              const systemName = backshopNameCleanup(nameRaw)
              if (!systemName) {
                rowSkippedReasons.emptyName++
                rowSkippedDetails.emptyName.push({ row: excelRow1Based, col: nameCol + 1 })
                continue
              }
              if (seenPLUs.has(plu)) {
                rowSkippedReasons.duplicatePlu++
                const first = rowFirstOccurrence.get(plu)
                rowSkippedDetails.duplicatePlu.push({
                  row: excelRow1Based,
                  col: pluCol + 1,
                  plu,
                  firstRow: first?.row ?? excelRow1Based,
                  firstCol: first?.col ?? pluCol + 1,
                  ...(imageCol >= 0 && {
                    orphanImageSheetRow0: r,
                    orphanImageSheetCol0: imageCol,
                  }),
                })
                continue
              }
              seenPLUs.add(plu)
              rowFirstOccurrence.set(plu, { row: excelRow1Based, col: pluCol + 1 })
              rowRows.push({
                plu,
                systemName,
                imageColumnIndex: imageCol,
                imageUrl: null,
                pluSheetRow: excelRow1Based,
                pluSheetCol: pluCol + 1,
                ...(imageCol >= 0 && { imageSheetRow0: r, imageSheetCol0: imageCol }),
              })
            }
            const rowSkipped =
              rowSkippedReasons.invalidPlu + rowSkippedReasons.emptyName + rowSkippedReasons.duplicatePlu
            if (rowRows.length > colRows.length) {
              return {
                rows: rowRows,
                fileName: file.name,
                totalRows: rowRows.length,
                skippedRows: rowSkipped,
                skippedReasons: rowSkipped > 0 ? rowSkippedReasons : undefined,
                skippedDetails: rowSkipped > 0 ? rowSkippedDetails : undefined,
                sameNameDifferentPlu: computeSameNameDifferentPlu(rowRows),
                detectedLayout: 'classic_rows',
                pluColumnIndex: pluCol,
                nameColumnIndex: nameCol,
                hasImageColumn: imageCol >= 0,
              }
            }
          }
          return {
            rows: colRows,
            fileName: file.name,
            totalRows: colRows.length,
            skippedRows: colResult.skippedRows,
            skippedReasons: colResult.skippedRows > 0 ? colResult.skippedReasons : undefined,
            skippedDetails: colResult.skippedRows > 0 ? colResult.skippedDetails : undefined,
            sameNameDifferentPlu: computeSameNameDifferentPlu(colRows),
            detectedLayout: 'kassenblatt_blocks',
            pluColumnIndex: 1,
            nameColumnIndex: 0,
            hasImageColumn: true,
          }
        }

        // Klassisches Zeilen-Layout: Header-Zeile mit PLU/WARENTEXT/ABBILDUNG, eine Zeile pro Produkt
        let headerRowIndex = 0
        for (let r = 0; r < Math.min(25, rowsStr.length); r++) {
          const row = rowsStr[r] ?? []
          if (row.some((cell) => isHeaderLike(cell))) {
            headerRowIndex = r
            break
          }
        }

        const { pluCol, nameCol, imageCol } = detectColumns(rowsStr, headerRowIndex)
        const seenPLUs = new Set<string>()
        const firstOccurrence = new Map<string, { row: number; col: number }>()
        const rows: ParsedBackshopRow[] = []
        const skippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
        const skippedDetails: BackshopSkippedDetails = {
          invalidPlu: [],
          emptyName: [],
          duplicatePlu: [],
        }

        for (let r = headerRowIndex + 1; r < rowsStr.length; r++) {
          const excelRow1Based = r + 1
          const cells = rowsStr[r] ?? []
          const pluRaw = String(cells[pluCol] ?? '').trim()
          const plu = normalizePLU(pluRaw)
          if (!PLU_REGEX.test(plu)) {
            skippedReasons.invalidPlu++
            skippedDetails.invalidPlu.push({
              row: excelRow1Based,
              col: pluCol + 1,
              rawCell: truncateSkippedCellRaw(pluRaw),
            })
            continue
          }
          const nameRaw = (cells[nameCol] ?? '').trim()
          const systemName = backshopNameCleanup(nameRaw)
          if (!systemName) {
            skippedReasons.emptyName++
            skippedDetails.emptyName.push({ row: excelRow1Based, col: nameCol + 1 })
            continue
          }
          if (seenPLUs.has(plu)) {
            skippedReasons.duplicatePlu++
            const first = firstOccurrence.get(plu)
            skippedDetails.duplicatePlu.push({
              row: excelRow1Based,
              col: pluCol + 1,
              plu,
              firstRow: first?.row ?? excelRow1Based,
              firstCol: first?.col ?? pluCol + 1,
              ...(imageCol >= 0 && {
                orphanImageSheetRow0: r,
                orphanImageSheetCol0: imageCol,
              }),
            })
            continue
          }
          seenPLUs.add(plu)
          firstOccurrence.set(plu, { row: excelRow1Based, col: pluCol + 1 })

          rows.push({
            plu,
            systemName,
            imageColumnIndex: imageCol,
            imageUrl: null, // Wird nach Upload in Storage gesetzt
            pluSheetRow: excelRow1Based,
            pluSheetCol: pluCol + 1,
            ...(imageCol >= 0 && { imageSheetRow0: r, imageSheetCol0: imageCol }),
          })
        }

        const skippedRows =
          skippedReasons.invalidPlu + skippedReasons.emptyName + skippedReasons.duplicatePlu

        // Kassenblatt-Safety-Netz:
        // (a) Klassischer Parser fand 0 Produkte → Kassenblatt probieren.
        // (b) Klassischer Parser fand <30 % der Datenzeilen als valide → Kassenblatt probieren
        //     und das Ergebnis mit den meisten Treffern wählen.
        const dataRowCount = Math.max(0, rowsStr.length - headerRowIndex - 1)
        const classicRatio = dataRowCount > 0 ? rows.length / dataRowCount : 0
        const shouldTryKassenblatt =
          (rows.length === 0 && skippedReasons.invalidPlu >= 5) ||
          (classicRatio < 0.3 && skippedReasons.invalidPlu >= 5)
        if (shouldTryKassenblatt) {
          const kassenblatt = parseKassenblattColumnLayout(rowsStr)
          if (kassenblatt.rows.length > rows.length) {
            const kbSkipped =
              kassenblatt.skippedReasons.invalidPlu +
              kassenblatt.skippedReasons.emptyName +
              kassenblatt.skippedReasons.duplicatePlu
            const hasKassenblattImages = kassenblatt.rows.some(
              (r) => r.imageSheetRow0 !== undefined && r.imageSheetCol0 !== undefined
            )
            return {
              rows: kassenblatt.rows,
              fileName: file.name,
              totalRows: kassenblatt.rows.length,
              skippedRows: kbSkipped,
              skippedReasons: kbSkipped > 0 ? kassenblatt.skippedReasons : undefined,
              skippedDetails: kbSkipped > 0 ? kassenblatt.skippedDetails : undefined,
              sameNameDifferentPlu: computeSameNameDifferentPlu(kassenblatt.rows),
              detectedLayout: 'kassenblatt_blocks',
              pluColumnIndex: 0,
              nameColumnIndex: 0,
              hasImageColumn: hasKassenblattImages,
            }
          }
        }

    return {
      rows,
      fileName: file.name,
      totalRows: rows.length,
      skippedRows,
      skippedReasons: skippedRows > 0 ? skippedReasons : undefined,
      skippedDetails: skippedRows > 0 ? skippedDetails : undefined,
      sameNameDifferentPlu: computeSameNameDifferentPlu(rows),
      detectedLayout: 'classic_rows',
      pluColumnIndex: pluCol,
      nameColumnIndex: nameCol,
      hasImageColumn: imageCol >= 0,
    }
  } catch (err) {
    throw new Error(`Backshop-Excel-Parsing fehlgeschlagen: ${formatError(err)}`)
  }
}

// ============================================================
// Preview + manuelles Spalten-Mapping (Fallback-Dialog)
// ============================================================

/** Vorschau: die ersten N Zeilen als Tabellen-Daten für manuelle Spalten-Auswahl. */
export interface BackshopExcelPreview {
  fileName: string
  /** 2D-Array der ersten Zeilen (getrimmte Strings). */
  rows: string[][]
  /** Zeilenindex der vermuteten Header-Zeile (0-basiert) oder -1 wenn nicht erkannt. */
  headerRowIndex: number
  /** Automatische Erkennung als Vorauswahl (ggf. -1). */
  autoPluCol: number
  autoNameCol: number
  autoImageCol: number
  /** Anzahl Spalten (für Auswahl-Dropdowns). */
  colCount: number
}

/** Liest die ersten Zeilen eines Backshop-Excels und liefert die Vorauswahl der Spalten. */
export async function previewBackshopExcelFile(
  file: File,
  maxRows = 15,
): Promise<BackshopExcelPreview> {
  const rawRows = await loadExcelSheetAsRows(file)
  const rowsStr: string[][] = rawRows.map((row) =>
    (row as unknown[]).map((cell) => (cell != null ? String(cell).trim() : '')),
  )
  let headerRowIndex = -1
  for (let r = 0; r < Math.min(25, rowsStr.length); r++) {
    const row = rowsStr[r] ?? []
    if (row.some((cell) => isHeaderLike(cell))) {
      headerRowIndex = r
      break
    }
  }
  const effectiveHeader = headerRowIndex >= 0 ? headerRowIndex : 0
  const { pluCol, nameCol, imageCol } = detectColumns(rowsStr, effectiveHeader)
  const colCount = Math.max(0, ...rowsStr.slice(0, maxRows).map((r) => r.length))
  return {
    fileName: file.name,
    rows: rowsStr.slice(0, maxRows),
    headerRowIndex,
    autoPluCol: pluCol,
    autoNameCol: nameCol,
    autoImageCol: imageCol,
    colCount,
  }
}

/** Mapping-Modus für manuelle Spalten-/Block-Auswahl. */
export type BackshopManualLayoutMode = 'classic' | 'block'

/** Gemeinsamer Typ für das manuelle Mapping aus dem Dialog. */
export interface BackshopManualMapping {
  /** Layout-Modus. `classic` = eine Zeile pro Produkt; `block` = pro Spalte ein Produkt (Kassenblatt). */
  layoutMode?: BackshopManualLayoutMode
  // Classic
  pluCol: number
  nameCol: number
  imageCol: number
  /** Headerzeile (0-basiert). `-1` = keine Header-Zeile, Datenzeilen beginnen bei 0. */
  headerRowIndex?: number
  // Block
  /** Zeile mit Produktnamen (0-basiert). */
  nameRowIndex?: number
  /** Zeile mit PLU (0-basiert). */
  pluRowIndex?: number
  /** Zeile mit Bild-Anker (0-basiert, optional). `-1` oder `undefined` = keine Bildzeile. */
  imageRowIndex?: number
  /** Blockhöhe in Zeilen (für Wiederholung der Bänder). Default 5. */
  blockSize?: number
}

/**
 * Parst eine Backshop-Excel mit manuell gewählten Spalten (classic) oder Block-Positionen (block).
 * Verwendet im `classic`-Modus Zeilen-Layout (eine Zeile = ein Produkt).
 * Im `block`-Modus Kassenblatt-Layout: pro Spalte ein Produkt (Name-Zeile, PLU-Zeile, optional Bild-Zeile).
 */
export async function parseBackshopExcelFileWithColumns(
  file: File,
  mapping: BackshopManualMapping,
): Promise<BackshopParseResult> {
  try {
    const rawRows = await loadExcelSheetAsRows(file)
    const rowsStr: string[][] = rawRows.map((row) =>
      (row as unknown[]).map((cell) => (cell != null ? String(cell).trim() : '')),
    )

    // Block-Modus: manuell angegebene Zeilen
    if ((mapping.layoutMode ?? 'classic') === 'block') {
      return parseManualBlockLayout(file, rowsStr, mapping)
    }

    // Classic-Modus: User kann `-1` wählen → „keine Header-Zeile“
    let headerRowIndex = mapping.headerRowIndex ?? -1
    if (mapping.headerRowIndex === -1) {
      // „keine Kopfzeile“ → Daten beginnen bei Zeile 0
      headerRowIndex = -1
    } else if (headerRowIndex < 0) {
      for (let r = 0; r < Math.min(25, rowsStr.length); r++) {
        const row = rowsStr[r] ?? []
        if (row.some((cell) => isHeaderLike(cell))) {
          headerRowIndex = r
          break
        }
      }
      if (headerRowIndex < 0) headerRowIndex = 0
    }

    const pluCol = mapping.pluCol
    const nameCol = mapping.nameCol
    const imageCol = mapping.imageCol

    const seenPLUs = new Set<string>()
    const firstOccurrence = new Map<string, { row: number; col: number }>()
    const rows: ParsedBackshopRow[] = []
    const skippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
    const skippedDetails: BackshopSkippedDetails = {
      invalidPlu: [],
      emptyName: [],
      duplicatePlu: [],
    }

    for (let r = headerRowIndex + 1; r < rowsStr.length; r++) {
      const excelRow1Based = r + 1
      const cells = rowsStr[r] ?? []
      const pluRaw = String(cells[pluCol] ?? '').trim()
      const plu = normalizePLU(pluRaw)
      if (!PLU_REGEX.test(plu)) {
        if (pluRaw.length > 0) {
          skippedReasons.invalidPlu++
          skippedDetails.invalidPlu.push({
            row: excelRow1Based,
            col: pluCol + 1,
            rawCell: truncateSkippedCellRaw(pluRaw),
          })
        }
        continue
      }
      const nameRaw = String(cells[nameCol] ?? '').trim()
      const systemName = backshopNameCleanup(nameRaw)
      if (!systemName) {
        skippedReasons.emptyName++
        skippedDetails.emptyName.push({ row: excelRow1Based, col: nameCol + 1 })
        continue
      }
      if (seenPLUs.has(plu)) {
        skippedReasons.duplicatePlu++
        const first = firstOccurrence.get(plu)
        skippedDetails.duplicatePlu.push({
          row: excelRow1Based,
          col: pluCol + 1,
          plu,
          firstRow: first?.row ?? excelRow1Based,
          firstCol: first?.col ?? pluCol + 1,
          ...(imageCol >= 0 && {
            orphanImageSheetRow0: r,
            orphanImageSheetCol0: imageCol,
          }),
        })
        continue
      }
      seenPLUs.add(plu)
      firstOccurrence.set(plu, { row: excelRow1Based, col: pluCol + 1 })
      rows.push({
        plu,
        systemName,
        imageColumnIndex: imageCol,
        imageUrl: null,
        pluSheetRow: excelRow1Based,
        pluSheetCol: pluCol + 1,
        ...(imageCol >= 0 && { imageSheetRow0: r, imageSheetCol0: imageCol }),
      })
    }

    const skippedRows =
      skippedReasons.invalidPlu + skippedReasons.emptyName + skippedReasons.duplicatePlu

    return {
      rows,
      fileName: file.name,
      totalRows: rows.length,
      skippedRows,
      skippedReasons: skippedRows > 0 ? skippedReasons : undefined,
      skippedDetails: skippedRows > 0 ? skippedDetails : undefined,
      sameNameDifferentPlu: computeSameNameDifferentPlu(rows),
      detectedLayout: 'classic_rows',
      pluColumnIndex: pluCol,
      nameColumnIndex: nameCol,
      hasImageColumn: imageCol >= 0,
    }
  } catch (err) {
    throw new Error(`Backshop-Excel-Parsing (manuelle Spalten) fehlgeschlagen: ${formatError(err)}`)
  }
}

/**
 * Block-Layout mit manueller Angabe: Namens-, PLU- und (optional) Bild-Zeile plus Blockgröße.
 * Durchläuft alle Bänder `start = nameRowIndex + k * blockSize`, solange Daten vorhanden sind.
 * Pro Band wird für jede Spalte ein Produkt angelegt (Name aus Namens-Zeile, PLU aus PLU-Zeile).
 */
function parseManualBlockLayout(
  file: File,
  rowsStr: string[][],
  mapping: BackshopManualMapping,
): BackshopParseResult {
  const nameRow0 = Math.max(0, mapping.nameRowIndex ?? 0)
  const pluRow0 = Math.max(0, mapping.pluRowIndex ?? nameRow0 + 1)
  const imageRow0 = mapping.imageRowIndex != null && mapping.imageRowIndex >= 0 ? mapping.imageRowIndex : -1
  const blockSize = Math.max(1, mapping.blockSize ?? 5)

  const seenPLUs = new Set<string>()
  const firstOccurrence = new Map<string, { row: number; col: number }>()
  const rows: ParsedBackshopRow[] = []
  const skippedReasons: BackshopSkippedReasons = { invalidPlu: 0, emptyName: 0, duplicatePlu: 0 }
  const skippedDetails: BackshopSkippedDetails = {
    invalidPlu: [],
    emptyName: [],
    duplicatePlu: [],
  }

  const nameOffset = 0
  const pluOffset = pluRow0 - nameRow0
  const imageOffset = imageRow0 >= 0 ? imageRow0 - nameRow0 : -1

  for (let bandStart = nameRow0; bandStart + pluOffset < rowsStr.length; bandStart += blockSize) {
    const nameRow = rowsStr[bandStart + nameOffset] ?? []
    const pluRow = rowsStr[bandStart + pluOffset] ?? []
    const maxCol = Math.max(nameRow.length, pluRow.length)
    if (maxCol === 0) continue

    const hasImageRow = imageOffset >= 0 && bandStart + imageOffset < rowsStr.length

    for (let c = 0; c < maxCol; c++) {
      const nameRaw = String(nameRow[c] ?? '').trim()
      const pluRaw = String(pluRow[c] ?? '').trim()
      if (!pluRaw && !nameRaw) continue

      const systemName = backshopNameCleanup(nameRaw)
      const plu = normalizePLU(pluRaw)

      if (!PLU_REGEX.test(plu)) {
        if (pluRaw.length > 0) {
          skippedReasons.invalidPlu++
          skippedDetails.invalidPlu.push({
            row: bandStart + pluOffset + 1,
            col: c + 1,
            rawCell: truncateSkippedCellRaw(pluRaw),
          })
        }
        continue
      }
      if (!systemName) {
        skippedReasons.emptyName++
        skippedDetails.emptyName.push({ row: bandStart + nameOffset + 1, col: c + 1 })
        continue
      }
      if (seenPLUs.has(plu)) {
        skippedReasons.duplicatePlu++
        const first = firstOccurrence.get(plu)
        skippedDetails.duplicatePlu.push({
          row: bandStart + pluOffset + 1,
          col: c + 1,
          plu,
          firstRow: first?.row ?? bandStart + pluOffset + 1,
          firstCol: first?.col ?? c + 1,
          ...(hasImageRow && {
            orphanImageSheetRow0: bandStart + imageOffset,
            orphanImageSheetCol0: c,
          }),
        })
        continue
      }

      seenPLUs.add(plu)
      firstOccurrence.set(plu, { row: bandStart + pluOffset + 1, col: c + 1 })
      rows.push({
        plu,
        systemName,
        imageColumnIndex: hasImageRow ? c : -1,
        imageUrl: null,
        pluSheetRow: bandStart + pluOffset + 1,
        pluSheetCol: c + 1,
        ...(hasImageRow && { imageSheetRow0: bandStart + imageOffset, imageSheetCol0: c }),
      })
    }
  }

  const skippedRows =
    skippedReasons.invalidPlu + skippedReasons.emptyName + skippedReasons.duplicatePlu
  return {
    rows,
    fileName: file.name,
    totalRows: rows.length,
    skippedRows,
    skippedReasons: skippedRows > 0 ? skippedReasons : undefined,
    skippedDetails: skippedRows > 0 ? skippedDetails : undefined,
    sameNameDifferentPlu: computeSameNameDifferentPlu(rows),
    detectedLayout: 'kassenblatt_blocks',
    pluColumnIndex: 0,
    nameColumnIndex: 0,
    hasImageColumn: imageOffset >= 0,
  }
}
