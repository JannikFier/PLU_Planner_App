// PDF-Generator: Erstellt ein PDF-Dokument aus DisplayItem[]
// Nutzt jsPDF für ein Zwei-Spalten-Layout im A4-Format

import jsPDF from 'jspdf'
import type { DisplayItem } from '@/types/plu'
import type { Block } from '@/types/database'
import { getDisplayPlu, getDisplayNameForItem, formatPreisEur, groupItemsByLetter, groupItemsByBlock } from '@/lib/plu-helpers'

// Farbwerte – Druckoptimiert: Schwarze Linien, Statusfarben für Semantik, sonst Schwarz/Weiß
const COLORS = {
  // Gelb (Neues Produkt) – bleibt für Semantik
  newBg: [254, 243, 199] as [number, number, number],
  newText: [146, 64, 14] as [number, number, number],
  // Rot (PLU geändert) – bleibt für Semantik
  changedBg: [254, 226, 226] as [number, number, number],
  changedText: [153, 27, 27] as [number, number, number],
  // Header
  headerBg: [30, 41, 59] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  // Zebra – helles Grau für Druck
  zebraLight: [245, 245, 245] as [number, number, number],
  // Gruppen-Header
  groupBg: [235, 235, 235] as [number, number, number],
  groupText: [0, 0, 0] as [number, number, number],
  // Rahmen – schwarz für klare Tabelle (Drucker)
  border: [0, 0, 0] as [number, number, number],
}

// Layout-Konstanten
const PAGE = {
  width: 210,          // A4 Breite in mm
  height: 297,         // A4 Höhe in mm
  marginLeft: 10,
  marginRight: 10,
  marginTop: 10,
  marginBottom: 15,
  headerHeight: 14,    // KW-Banner Höhe
  columnHeaderH: 8,    // Spaltenköpfe Höhe
  rowHeight: 5.5,      // Zeile Höhe
  groupHeaderH: 6,     // Gruppen-Header Höhe
  footerHeight: 8,     // Footer Höhe
  columnGap: 0,        // Keine weißen Kästen, keine Mittellinie (Benutzerwunsch)
}

/** Schriftgrößen in pt (aus layout_settings oder Defaults) */
export interface PDFFontSizes {
  header: number
  column: number
  product: number
}

const DEFAULT_PDF_FONTS: PDFFontSizes = {
  header: 18,
  column: 10,
  product: 8,
}

/** px aus Planner → pt für PDF (ungefährer Faktor) */
function pxToPt(px: number): number {
  return Math.round(px * 0.65)
}

interface PDFGeneratorInput {
  items: DisplayItem[]
  kwLabel: string
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  /** Schriftgrößen aus Layout-Einstellungen (optional) */
  fontSizes?: { header: number; column: number; product: number }
}

/** Einzelne Zeile im PDF (Item oder Gruppen-Header) */
interface PDFRow {
  type: 'group' | 'item'
  label?: string
  item?: DisplayItem
}

/**
 * Erzeugt ein PDF-Dokument mit der PLU-Liste.
 * Zwei-Spalten-Layout, Farbmarkierungen, Seitenumbrüche, Footer.
 */
export function generatePDF(input: PDFGeneratorInput): jsPDF {
  const { items, kwLabel, displayMode, sortMode, flowDirection, blocks, fontSizes: inputFonts } = input
  const PDF_FONTS: PDFFontSizes & { group: number } = inputFonts
    ? {
        header: Math.max(12, Math.min(28, pxToPt(inputFonts.header))),
        column: Math.max(8, Math.min(16, pxToPt(inputFonts.column))),
        product: Math.max(6, Math.min(14, pxToPt(inputFonts.product))),
        group: Math.max(7, Math.min(12, pxToPt(inputFonts.column) - 1)),
      }
    : { ...DEFAULT_PDF_FONTS, group: 9 } as PDFFontSizes & { group: number }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Datum für Footer
  const dateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // SEPARATED: Zwei Durchläufe (Stück + Gewicht)
  if (displayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')

    if (pieceItems.length > 0) {
      const piecePDFRows = buildPDFRows(pieceItems, sortMode, blocks)
      renderSection(doc, piecePDFRows, `${kwLabel} – Stück`, dateStr, kwLabel, flowDirection, PDF_FONTS)
    }

    if (weightItems.length > 0) {
      if (pieceItems.length > 0) doc.addPage()
      const weightPDFRows = buildPDFRows(weightItems, sortMode, blocks)
      renderSection(doc, weightPDFRows, `${kwLabel} – Gewicht`, dateStr, kwLabel, flowDirection, PDF_FONTS)
    }
  } else {
    // MIXED: Ein Durchlauf
    const pdfRows = buildPDFRows(items, sortMode, blocks)
    renderSection(doc, pdfRows, kwLabel, dateStr, kwLabel, flowDirection, PDF_FONTS)
  }

  return doc
}

/** Baut die flache Zeilen-Liste für das PDF (Gruppen-Header + Items) */
function buildPDFRows(
  items: DisplayItem[],
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK',
  blocks: Block[],
): PDFRow[] {
  const rows: PDFRow[] = []

  if (sortMode === 'BY_BLOCK') {
    const groups = groupItemsByBlock(items, blocks)
    for (const group of groups) {
      rows.push({ type: 'group', label: group.blockName })
      for (const item of group.items) {
        rows.push({ type: 'item', item })
      }
    }
  } else {
    const groups = groupItemsByLetter(items)
    for (const group of groups) {
      rows.push({ type: 'group', label: `— ${group.letter} —` })
      for (const item of group.items) {
        rows.push({ type: 'item', item })
      }
    }
  }

  return rows
}

type FontSizes = PDFFontSizes & { group: number }

/** Rendert eine Sektion (alle Zeilen) und gibt die Anzahl genutzter Seiten zurück */
function renderSection(
  doc: jsPDF,
  pdfRows: PDFRow[],
  title: string,
  dateStr: string,
  kwLabel: string,
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST',
  fonts: FontSizes,
): number {
  const usableWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight
  const colWidth = (usableWidth - PAGE.columnGap) / 2
  const pluColWidth = 18   // PLU-Spalte Breite
  const preisColWidth = 16 // Preis-Spalte (wie PLU, hinten)
  const nameColWidth = colWidth - pluColWidth - preisColWidth

  const rightColStart = PAGE.marginLeft + colWidth + PAGE.columnGap
  const centerDividerX = PAGE.marginLeft + colWidth  // Strich zwischen linker und rechter Spalte

  let currentPage = 1
  let yPos = PAGE.marginTop

  // === Header-Banner ===
  function drawHeader() {
    doc.setFillColor(...COLORS.headerBg)
    doc.rect(PAGE.marginLeft, yPos, usableWidth, PAGE.headerHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.header)
    doc.setTextColor(...COLORS.headerText)
    doc.text(title, PAGE.width / 2, yPos + PAGE.headerHeight / 2 + 1, { align: 'center' })
    yPos += PAGE.headerHeight + 2
  }

  // === Spaltenköpfe – nur Text, KEINE vertikalen Linien (Benutzerwunsch) ===
  function drawColumnHeaders() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.column)
    doc.setTextColor(0, 0, 0)

    const leftX = PAGE.marginLeft
    const rightX = rightColStart

    doc.text('PLU', leftX + 1, yPos + PAGE.columnHeaderH / 2 + 1)
    doc.text('Artikel', leftX + pluColWidth + 1, yPos + PAGE.columnHeaderH / 2 + 1)

    doc.text('PLU', rightX + 1, yPos + PAGE.columnHeaderH / 2 + 1)
    doc.text('Artikel', rightX + pluColWidth + 1, yPos + PAGE.columnHeaderH / 2 + 1)

    // Nur horizontale Linie unter den Köpfen (keine vertikalen Striche)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.6)
    doc.line(PAGE.marginLeft, yPos + PAGE.columnHeaderH, PAGE.marginLeft + usableWidth, yPos + PAGE.columnHeaderH)

    yPos += PAGE.columnHeaderH + 1
  }

  // === Footer ===
  function drawFooter(pageNum: number) {
    const footerY = PAGE.height - PAGE.marginBottom + 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.text(kwLabel, PAGE.marginLeft, footerY)
    doc.text(dateStr, PAGE.width / 2, footerY, { align: 'center' })
    doc.text(`Seite ${pageNum}`, PAGE.width - PAGE.marginRight, footerY, { align: 'right' })
  }

  // === Neue Seite starten ===
  function startNewPage() {
    drawFooter(currentPage)
    doc.addPage()
    currentPage++
    yPos = PAGE.marginTop
    drawColumnHeaders()
  }

  // Zebra-Striping für ganze Zeile (vor drawItem aufrufen)
  function drawRowZebraBackground(y: number, rowHeight: number, rowIndex: number) {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.zebraLight)
      doc.rect(PAGE.marginLeft, y, usableWidth, rowHeight, 'F')
    }
  }

  // Vertikaler Strich zwischen linker und rechter Spalte (vor zweiter PLU)
  function drawCenterDivider(yStart: number, yEnd: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(centerDividerX, yStart, centerDividerX, yEnd)
  }

  // === Einzelnes Item zeichnen ===
  function drawItem(item: DisplayItem, x: number, y: number) {
    // Strich zwischen PLU und Artikel (immer); Strich vor Preis NUR wenn Produkt einen Preis hat
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(x + pluColWidth, y, x + pluColWidth, y + PAGE.rowHeight)
    if (item.preis != null) {
      doc.line(x + pluColWidth + nameColWidth, y, x + pluColWidth + nameColWidth, y + PAGE.rowHeight)
    }

    // PLU-Zelle mit Statusfarbe
    if (item.status === 'NEW_PRODUCT_YELLOW') {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(x, y, pluColWidth, PAGE.rowHeight, 'F')
      doc.setTextColor(...COLORS.newText)
    } else if (item.status === 'PLU_CHANGED_RED') {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(x, y, pluColWidth, PAGE.rowHeight, 'F')
      doc.setTextColor(...COLORS.changedText)
    } else {
      doc.setTextColor(0, 0, 0)
    }

    // PLU
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.product)
    doc.text(getDisplayPlu(item.plu), x + 1, y + PAGE.rowHeight / 2 + 1)

    // Artikelname (ohne Stern)
    doc.setTextColor(0, 0, 0)
    const displayName = getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
    const maxChars = Math.floor(nameColWidth / 1.8)
    const truncatedName = displayName.length > maxChars ? displayName.slice(0, maxChars - 1) + '…' : displayName
    doc.text(truncatedName, x + pluColWidth + 1, y + PAGE.rowHeight / 2 + 1)

    // Preis-Spalte (Kasten wie PLU, gelbe Markierung bei neuem Produkt)
    const preisX = x + pluColWidth + nameColWidth
    if (item.status === 'NEW_PRODUCT_YELLOW' && item.preis != null) {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(preisX, y, preisColWidth, PAGE.rowHeight, 'F')
      doc.setTextColor(...COLORS.newText)
    } else if (item.status === 'PLU_CHANGED_RED' && item.preis != null) {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(preisX, y, preisColWidth, PAGE.rowHeight, 'F')
      doc.setTextColor(...COLORS.changedText)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    if (item.preis != null) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fonts.product)
      doc.text(formatPreisEur(item.preis), preisX + 1, y + PAGE.rowHeight / 2 + 1)
    }
  }

  // Gruppen-Header: Hintergrund für ganze Zeile (vor dem Text), dann Text zentriert in Spalte
  function drawGroupHeaderFullRow(y: number) {
    doc.setFillColor(...COLORS.groupBg)
    doc.rect(PAGE.marginLeft, y, usableWidth, PAGE.groupHeaderH, 'F')
  }

  function drawGroupHeaderLabel(label: string, x: number, y: number, width: number) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.group)
    doc.setTextColor(...COLORS.groupText)
    doc.text(label, x + width / 2, y + PAGE.groupHeaderH / 2 + 1, { align: 'center' })
  }

  function drawGroupHeader(label: string, x: number, y: number, width: number) {
    drawGroupHeaderFullRow(y)
    drawGroupHeaderLabel(label, x, y, width)
  }

  // Schwarze Linien für klare Tabelle (Drucker)
  function drawRowLine(y: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(PAGE.marginLeft, y, PAGE.marginLeft + usableWidth, y)
  }

  // === Haupt-Rendering ===
  drawHeader()
  drawColumnHeaders()

  const maxY = PAGE.height - PAGE.marginBottom - PAGE.footerHeight

  if (flowDirection === 'ROW_BY_ROW') {
    // ROW_BY_ROW: Items paarweise (1→links, 2→rechts, 3→links...)
    let rowIndex = 0
    let i = 0

    while (i < pdfRows.length) {
      const row = pdfRows[i]

      if (row.type === 'group') {
        if (yPos + PAGE.groupHeaderH > maxY) startNewPage()
        drawGroupHeader(row.label!, PAGE.marginLeft, yPos, usableWidth)
        drawRowLine(yPos + PAGE.groupHeaderH)
        yPos += PAGE.groupHeaderH
        rowIndex = 0
        i++
        continue
      }

      if (yPos + PAGE.rowHeight > maxY) startNewPage()

      const leftItem = row.item!
      const leftX = PAGE.marginLeft
      const rightX = rightColStart

      drawRowZebraBackground(yPos, PAGE.rowHeight, rowIndex)
      drawItem(leftItem, leftX, yPos)

      if (i + 1 < pdfRows.length && pdfRows[i + 1].type === 'item') {
        drawItem(pdfRows[i + 1].item!, rightX, yPos)
        drawCenterDivider(yPos, yPos + PAGE.rowHeight)
        i += 2
      } else {
        drawCenterDivider(yPos, yPos + PAGE.rowHeight)
        i++
      }

      drawRowLine(yPos + PAGE.rowHeight)
      yPos += PAGE.rowHeight
      rowIndex++
    }
  } else {
    // COLUMN_FIRST: Erste Hälfte links, zweite Hälfte rechts
    // Items aufteilen (ohne Gruppen-Header)
    const itemCount = pdfRows.filter((r) => r.type === 'item').length
    const midPoint = Math.ceil(itemCount / 2)

    // Gruppen für jede Spalte bestimmen
    const leftRows = buildColumnRows(pdfRows, 0, midPoint)
    const rightRows = buildColumnRows(pdfRows, midPoint, itemCount)

    const maxRows = Math.max(leftRows.length, rightRows.length)
    let rowIndex = 0

    for (let j = 0; j < maxRows; j++) {
      const leftRow = leftRows[j]
      const rightRow = rightRows[j]

      // Höhe für diese Zeile bestimmen
      const isLeftGroup = leftRow?.type === 'group'
      const isRightGroup = rightRow?.type === 'group'
      const rowH = (isLeftGroup || isRightGroup) ? PAGE.groupHeaderH : PAGE.rowHeight

      if (yPos + rowH > maxY) startNewPage()

      const leftX = PAGE.marginLeft
      const rightX = rightColStart

      if (isLeftGroup || isRightGroup) {
        drawGroupHeaderFullRow(yPos)
        if (leftRow?.type === 'group') drawGroupHeaderLabel(leftRow.label!, leftX, yPos, colWidth)
        if (rightRow?.type === 'group') drawGroupHeaderLabel(rightRow.label!, rightX, yPos, colWidth)
      } else {
        drawRowZebraBackground(yPos, rowH, rowIndex)
        if (leftRow?.item) drawItem(leftRow.item, leftX, yPos)
        if (rightRow?.item) drawItem(rightRow.item, rightX, yPos)
        drawCenterDivider(yPos, yPos + rowH)
      }

      drawRowLine(yPos + rowH)
      yPos += rowH
      if (!isLeftGroup && !isRightGroup) rowIndex++
    }
  }

  // Footer auf letzter Seite
  drawFooter(currentPage)

  return currentPage
}

/**
 * Baut die Zeilen für eine Spalte im COLUMN_FIRST Modus.
 * Ermittelt welche Gruppen-Header vor welchen Items stehen müssen.
 */
function buildColumnRows(allRows: PDFRow[], startItem: number, endItem: number): PDFRow[] {
  const result: PDFRow[] = []
  let itemIndex = 0
  let lastGroupLabel: string | null = null

  for (const row of allRows) {
    if (row.type === 'group') {
      lastGroupLabel = row.label!
      continue
    }

    // Nur Items im gewünschten Bereich
    if (itemIndex >= startItem && itemIndex < endItem) {
      // Gruppen-Header einfügen wenn sich die Gruppe geändert hat
      if (lastGroupLabel !== null) {
        result.push({ type: 'group', label: lastGroupLabel })
        lastGroupLabel = null
      }
      result.push(row)
    } else if (itemIndex >= endItem) {
      break
    }

    if (row.type === 'item') {
      itemIndex++
      // Gruppen-Header nur einmal pro Gruppe
      if (itemIndex <= startItem) {
        lastGroupLabel = null // Reset, da wir den Header noch nicht brauchen
      }
    }
  }

  return result
}
