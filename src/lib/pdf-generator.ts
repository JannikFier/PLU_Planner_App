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
  groupHeaderH: 12,     // Gruppen-Header Höhe (z. B. Brot – 24pt mit Abstand oben/unten)
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
  const hasAnyOffer = pdfRows.some((r) => r.type === 'item' && r.item?.is_offer)

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

    if (hasAnyOffer) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(120, 120, 120)
      doc.text('Angebot = rot umkreist', PAGE.marginLeft, yPos + 2)
      doc.setTextColor(0, 0, 0)
      yPos += 4
    }
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

  // Angebot-Label: Text „Angebot“ (optional mit Symbol) – Breite für Kürzung reservieren
  const OFFER_LABEL = ' Angebot'
  const offerLabelWidth = (() => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.product)
    return doc.getTextWidth(OFFER_LABEL) + 4 // +4 für kleinen roten Kreis
  })()

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

    // Artikelname – bei is_offer Platz für „Angebot“ (rot umkreist) lassen
    doc.setTextColor(0, 0, 0)
    const displayName = getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
    const maxNameWidth = item.is_offer ? nameColWidth - 2 - offerLabelWidth : nameColWidth - 2
    let nameToDraw = displayName
    const ellipsis = '…'
    if (doc.getTextWidth(displayName) > maxNameWidth) {
      while (nameToDraw.length > 0 && doc.getTextWidth(nameToDraw + ellipsis) > maxNameWidth) {
        nameToDraw = nameToDraw.slice(0, -1)
      }
      nameToDraw = nameToDraw + ellipsis
    }
    doc.text(nameToDraw, x + pluColWidth + 1, y + PAGE.rowHeight / 2 + 1)

    // Angebot: kleines Symbol + „Angebot“ rot umkreist (rechts im Namenbereich)
    if (item.is_offer) {
      const nameColRight = x + pluColWidth + nameColWidth
      const offerX = nameColRight - 1
      const cy = y + PAGE.rowHeight / 2 + 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fonts.product)
      doc.setTextColor(200, 0, 0)
      doc.text(OFFER_LABEL.trim(), offerX, cy, { align: 'right' })
      const tw = doc.getTextWidth(OFFER_LABEL.trim())
      const cx = offerX - tw / 2
      const r = Math.max(tw / 2 + 1, PAGE.rowHeight / 2 - 0.5)
      doc.setDrawColor(200, 0, 0)
      doc.setLineWidth(0.25)
      doc.circle(cx, cy - 0.5, r)
      doc.setTextColor(0, 0, 0)
    }

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

// ========== Backshop-PDF (Bild → PLU → Name, Kopf „PLU-Liste Backshop“, gleicher Footer) ==========

const BACKSHOP_ROW_HEIGHT = 22
/** Bild-Spalte: etwas breiter für größere Produktbilder. */
const BACKSHOP_IMAGE_SIZE = 22
/** PLU-Spalte: reicht für 5-stellige Nummer. */
const BACKSHOP_PLU_WIDTH = 14
/** Innenabstand in der PLU-Zelle (links und rechts), damit Abstand zum Strich gleich ist. */
const BACKSHOP_PLU_PADDING = 1.5
/** Mindesthöhe der Spaltenzeile „Bild PLU Name“ (Schrift kommt aus fonts.column) */
const BACKSHOP_COLUMN_HEADER_H = 6

export interface GenerateBackshopPDFInput {
  items: DisplayItem[]
  kwLabel: string
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  fontSizes?: { header: number; column: number; product: number }
  /** Bei Nach Warengruppen: jede Warengruppe auf neuer PDF-Seite beginnen */
  pageBreakPerBlock?: boolean
}

/** Lädt ein Bild von URL und gibt Data-URL plus Pixelmaße zurück; bei Fehler null. */
async function loadImageWithDimensions(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string | null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = dataUrl
    })
    return { dataUrl, width, height }
  } catch {
    return null
  }
}

/**
 * Erzeugt ein PDF für die Backshop-Liste: Reihenfolge Bild → PLU → Name,
 * Kopf „PLU-Liste Backshop“, Footer wie Obst/Gemüse.
 */
export async function generateBackshopPDF(input: GenerateBackshopPDFInput): Promise<jsPDF> {
  const { items, kwLabel, sortMode, flowDirection, blocks, fontSizes: inputFonts, pageBreakPerBlock = false } = input
  // Titel 32pt, Warengruppen (z. B. Brot) 24pt, Spalten/Produkte 18pt
  const fonts: PDFFontSizes & { group: number } = inputFonts
    ? {
        header: Math.max(12, Math.min(36, pxToPt(inputFonts.header))),
        column: Math.max(8, Math.min(20, pxToPt(inputFonts.column))),
        product: Math.max(7, Math.min(20, pxToPt(inputFonts.product))),
        group: 24, // Warengruppen-Header (z. B. Brot, Brötchen) fest 24pt
      }
    : { ...DEFAULT_PDF_FONTS, group: 24 } as PDFFontSizes & { group: number }

  const imageDataUrls = new Map<string, { dataUrl: string; width: number; height: number }>()
  const urlsToLoad = items.filter((i) => i.image_url).map((i) => ({ id: i.id, url: i.image_url! }))
  await Promise.all(
    urlsToLoad.map(async ({ id, url }) => {
      const loaded = await loadImageWithDimensions(url)
      if (loaded) imageDataUrls.set(id, loaded)
    }),
  )

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const dateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const pdfRows = buildPDFRows(items, sortMode, blocks)
  renderBackshopSection(doc, pdfRows, dateStr, kwLabel, flowDirection, fonts, imageDataUrls, pageBreakPerBlock)
  return doc
}

/** Rendert Backshop-Sektion: Header „PLU-Liste Backshop“, Zeilen Bild | PLU | Name, Footer. */
function renderBackshopSection(
  doc: jsPDF,
  pdfRows: PDFRow[],
  dateStr: string,
  kwLabel: string,
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST',
  fonts: PDFFontSizes & { group: number },
  imageDataUrls: Map<string, { dataUrl: string; width: number; height: number }>,
  pageBreakPerBlock: boolean,
): void {
  const usableWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight
  const colWidth = (usableWidth - PAGE.columnGap) / 2
  const imageSize = Math.min(BACKSHOP_IMAGE_SIZE, BACKSHOP_ROW_HEIGHT - 1)
  const pluWidth = BACKSHOP_PLU_WIDTH
  const nameWidth = colWidth - imageSize - pluWidth - 2

  const rightColStart = PAGE.marginLeft + colWidth + PAGE.columnGap
  const centerDividerX = PAGE.marginLeft + colWidth
  const hasAnyOffer = pdfRows.some((r) => r.type === 'item' && r.item?.is_offer)
  let currentPage = 1
  let yPos = PAGE.marginTop
  let tableStartY = PAGE.marginTop
  /** Nur COLUMN_FIRST: erste Produktzeile pro Seite ohne oberen Rahmen (vermeidet Doppellinie). */
  let firstProductRowDone = false
  /** ROW_BY_ROW: nächste Produktzeile ist erste nach Spaltenköpfen (inkl. nach Seitenumbruch) → kein oberer Rahmen. */
  let skipTopBorderForNextProductRow = true

  function drawHeader() {
    doc.setFillColor(...COLORS.headerBg)
    doc.rect(PAGE.marginLeft, yPos, usableWidth, PAGE.headerHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.header)
    doc.setTextColor(...COLORS.headerText)
    doc.text('PLU-Liste Backshop', PAGE.width / 2, yPos + PAGE.headerHeight / 2 + 1, { align: 'center' })
    yPos += PAGE.headerHeight + 2
  }

  function drawColumnHeaders() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.column)
    doc.setTextColor(0, 0, 0)
    const leftX = PAGE.marginLeft
    const rightX = rightColStart
    const headerH = BACKSHOP_COLUMN_HEADER_H
    doc.text('Bild', leftX + 1, yPos + headerH / 2 + 0.5)
    doc.text('PLU', leftX + imageSize + 1 + BACKSHOP_PLU_PADDING, yPos + headerH / 2 + 0.5)
    doc.text('Name', leftX + imageSize + 1 + pluWidth + 0.5, yPos + headerH / 2 + 0.5)
    doc.text('Bild', rightX + 1, yPos + headerH / 2 + 0.5)
    doc.text('PLU', rightX + imageSize + 1 + BACKSHOP_PLU_PADDING, yPos + headerH / 2 + 0.5)
    doc.text('Name', rightX + imageSize + 1 + pluWidth + 0.5, yPos + headerH / 2 + 0.5)
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(PAGE.marginLeft, yPos + headerH, PAGE.marginLeft + usableWidth, yPos + headerH)
    yPos += headerH + 1
    if (hasAnyOffer) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(120, 120, 120)
      doc.text('Angebot = rot umkreist', PAGE.marginLeft, yPos + 2)
      doc.setTextColor(0, 0, 0)
      yPos += 4
    }
  }

  function drawFooter(pageNum: number) {
    const footerY = PAGE.height - PAGE.marginBottom + 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.text(kwLabel, PAGE.marginLeft, footerY)
    doc.text(dateStr, PAGE.width / 2, footerY, { align: 'center' })
    doc.text(`Seite ${pageNum}`, PAGE.width - PAGE.marginRight, footerY, { align: 'right' })
  }

  /**
   * Neue Seite. Wenn groupLabel gesetzt ist (Umbruch mitten in einer Kategorie),
   * Kategorie und Spaltenköpfe auf der neuen Seite wiederholen.
   */
  function startNewPage(groupLabel?: string | null) {
    drawCenterDivider(tableStartY, yPos)
    drawInnerVerticalLines(tableStartY, yPos)
    drawOuterVerticalLines(tableStartY, yPos)
    drawFooter(currentPage)
    doc.addPage()
    currentPage++
    yPos = PAGE.marginTop
    if (flowDirection === 'COLUMN_FIRST') firstProductRowDone = false
    if (groupLabel != null && groupLabel !== '') {
      drawGroupHeader(groupLabel, yPos)
      drawRowLine(yPos + PAGE.groupHeaderH)
      tableStartY = yPos + PAGE.groupHeaderH
      yPos += PAGE.groupHeaderH
      yPos += 1.5
      drawColumnHeaders()
      if (flowDirection === 'ROW_BY_ROW') skipTopBorderForNextProductRow = true
    }
  }

  function drawRowLine(y: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(PAGE.marginLeft, y, PAGE.marginLeft + usableWidth, y)
  }

  function drawCenterDivider(yStart: number, yEnd: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(centerDividerX, yStart, centerDividerX, yEnd)
  }

  /** Vertikale Linien links und rechts der Tabelle (klare Tabellenstruktur). */
  function drawOuterVerticalLines(yStart: number, yEnd: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(PAGE.marginLeft, yStart, PAGE.marginLeft, yEnd)
    doc.line(PAGE.marginLeft + usableWidth, yStart, PAGE.marginLeft + usableWidth, yEnd)
  }

  /** Vertikale Trennlinien zwischen Bild | PLU | Name (ein Tabellenblock). */
  function drawInnerVerticalLines(yStart: number, yEnd: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.25)
    const leftX = PAGE.marginLeft
    const rightX = rightColStart
    doc.line(leftX + imageSize + 1, yStart, leftX + imageSize + 1, yEnd)
    doc.line(leftX + imageSize + 1 + pluWidth, yStart, leftX + imageSize + 1 + pluWidth, yEnd)
    doc.line(rightX + imageSize + 1, yStart, rightX + imageSize + 1, yEnd)
    doc.line(rightX + imageSize + 1 + pluWidth, yStart, rightX + imageSize + 1 + pluWidth, yEnd)
  }

  /** skipTopBorder: true bei erster Produktzeile, damit keine doppelte Linie über den Bildern (Trennlinie unter „Bild, PLU, Name“ reicht). */
  function drawBackshopItem(item: DisplayItem, x: number, y: number, skipTopBorder = false) {
    const imageInfo = item.id ? imageDataUrls.get(item.id) : null
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    const w = imageSize + 1
    const h = BACKSHOP_ROW_HEIGHT
    if (skipTopBorder) {
      doc.line(x, y + h, x, y)
      doc.line(x, y + h, x + w, y + h)
      doc.line(x + w, y + h, x + w, y)
    } else {
      doc.rect(x, y, w, h, 'S')
    }
    if (imageInfo) {
      try {
        const format = imageInfo.dataUrl.startsWith('data:image/jpeg') || imageInfo.dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'
        const iw = imageInfo.width
        const ih = imageInfo.height
        let drawW: number
        let drawH: number
        if (iw <= 0 || ih <= 0) {
          drawW = imageSize
          drawH = imageSize
        } else {
          const ratio = iw / ih
          if (ratio >= 1) {
            drawW = imageSize
            drawH = imageSize / ratio
          } else {
            drawH = imageSize
            drawW = imageSize * ratio
          }
        }
        const xOff = (imageSize - drawW) / 2
        const yOff = (imageSize - drawH) / 2
        doc.addImage(imageInfo.dataUrl, format, x + 0.5 + xOff, y + 0.5 + yOff, drawW, drawH)
      } catch {
        doc.setFontSize(6)
        doc.text('Bild', x + (imageSize + 1) / 2, y + BACKSHOP_ROW_HEIGHT / 2 + 1, { align: 'center' })
      }
    } else {
      doc.setFontSize(6)
      doc.setTextColor(128, 128, 128)
      doc.text('–', x + (imageSize + 1) / 2, y + BACKSHOP_ROW_HEIGHT / 2 + 1, { align: 'center' })
      doc.setTextColor(0, 0, 0)
    }

    const pluX = x + imageSize + 1
    if (item.status === 'NEW_PRODUCT_YELLOW') {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(pluX, y, pluWidth, BACKSHOP_ROW_HEIGHT, 'F')
      doc.setTextColor(...COLORS.newText)
    } else if (item.status === 'PLU_CHANGED_RED') {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(pluX, y, pluWidth, BACKSHOP_ROW_HEIGHT, 'F')
      doc.setTextColor(...COLORS.changedText)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.product)
    doc.text(getDisplayPlu(item.plu), pluX + BACKSHOP_PLU_PADDING, y + BACKSHOP_ROW_HEIGHT / 2 + 1)
    doc.setTextColor(0, 0, 0)

    const nameX = pluX + pluWidth
    const displayName = getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
    const backshopOfferLabel = ' Angebot'
    const backshopOfferLabelWidth = doc.getTextWidth(backshopOfferLabel.trim()) + 4
    const maxNameWidth = item.is_offer ? nameWidth - 1 - backshopOfferLabelWidth : nameWidth - 1
    let nameToDraw = displayName
    const ellipsis = '…'
    if (doc.getTextWidth(displayName) > maxNameWidth) {
      while (nameToDraw.length > 0 && doc.getTextWidth(nameToDraw + ellipsis) > maxNameWidth) {
        nameToDraw = nameToDraw.slice(0, -1)
      }
      nameToDraw = nameToDraw + ellipsis
    }
    doc.text(nameToDraw, nameX + 0.5, y + BACKSHOP_ROW_HEIGHT / 2 + 1)

    if (item.is_offer) {
      const nameColRight = nameX + nameWidth
      const cy = y + BACKSHOP_ROW_HEIGHT / 2 + 1
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(fonts.product)
      doc.setTextColor(200, 0, 0)
      doc.text(backshopOfferLabel.trim(), nameColRight - 0.5, cy, { align: 'right' })
      const tw = doc.getTextWidth(backshopOfferLabel.trim())
      const cx = nameColRight - 0.5 - tw / 2
      const r = Math.max(tw / 2 + 1, BACKSHOP_ROW_HEIGHT / 2 - 0.5)
      doc.setDrawColor(200, 0, 0)
      doc.setLineWidth(0.25)
      doc.circle(cx, cy - 0.5, r)
      doc.setTextColor(0, 0, 0)
    }
  }

  function drawGroupHeader(label: string, y: number) {
    doc.setFillColor(...COLORS.groupBg)
    doc.rect(PAGE.marginLeft, y, usableWidth, PAGE.groupHeaderH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.group)
    doc.setTextColor(...COLORS.groupText)
    // Baseline tiefer, damit 24pt-Text optisch in der Mitte des Kastens steht (nicht oben rausragt)
    doc.text(label, PAGE.marginLeft + usableWidth / 2, y + PAGE.groupHeaderH / 2 + 3, { align: 'center' })
  }

  drawHeader()

  const maxY = PAGE.height - PAGE.marginBottom - PAGE.footerHeight
  let groupIndex = 0
  let currentGroupLabel: string | null = null

  if (flowDirection === 'ROW_BY_ROW') {
    let rowIndex = 0
    let i = 0
    while (i < pdfRows.length) {
      const row = pdfRows[i]
      if (row.type === 'group') {
        const needNewPage = pageBreakPerBlock && groupIndex > 0
          || (yPos + PAGE.groupHeaderH + 1.5 + BACKSHOP_COLUMN_HEADER_H + 1 + BACKSHOP_ROW_HEIGHT > maxY)
        if (needNewPage) startNewPage()
        groupIndex++
        currentGroupLabel = row.label ?? null
        // Linie über grauem Kasten, Warengruppe (Brot), Linie darunter; Vertikale schließen an Unterkante Brot an
        drawRowLine(yPos)
        drawGroupHeader(row.label!, yPos)
        drawRowLine(yPos + PAGE.groupHeaderH)
        tableStartY = yPos + PAGE.groupHeaderH
        yPos += PAGE.groupHeaderH
        yPos += 1.5
        drawColumnHeaders()
        skipTopBorderForNextProductRow = true
        rowIndex = 0
        i++
        continue
      }
      if (yPos + BACKSHOP_ROW_HEIGHT > maxY) startNewPage(currentGroupLabel)
      const leftItem = row.item!
      const skipTop = skipTopBorderForNextProductRow
      skipTopBorderForNextProductRow = false
      drawBackshopItem(leftItem, PAGE.marginLeft, yPos, skipTop)
      if (i + 1 < pdfRows.length && pdfRows[i + 1].type === 'item') {
        drawBackshopItem(pdfRows[i + 1].item!, rightColStart, yPos, skipTop)
        drawCenterDivider(yPos, yPos + BACKSHOP_ROW_HEIGHT)
        i += 2
      } else {
        drawCenterDivider(yPos, yPos + BACKSHOP_ROW_HEIGHT)
        i++
      }
      drawRowLine(yPos + BACKSHOP_ROW_HEIGHT)
      yPos += BACKSHOP_ROW_HEIGHT
      rowIndex++
    }
  } else {
    const itemCount = pdfRows.filter((r) => r.type === 'item').length
    const midPoint = Math.ceil(itemCount / 2)
    const leftRows = buildColumnRows(pdfRows, 0, midPoint)
    const rightRows = buildColumnRows(pdfRows, midPoint, itemCount)
    const maxRows = Math.max(leftRows.length, rightRows.length)
    for (let j = 0; j < maxRows; j++) {
      const leftRow = leftRows[j]
      const rightRow = rightRows[j]
      const isLeftGroup = leftRow?.type === 'group'
      const isRightGroup = rightRow?.type === 'group'
      const rowH = (isLeftGroup || isRightGroup) ? PAGE.groupHeaderH : BACKSHOP_ROW_HEIGHT
      if (isLeftGroup || isRightGroup) {
        if (pageBreakPerBlock && groupIndex > 0) startNewPage()
        else if (yPos + rowH > maxY) startNewPage()
        groupIndex++
        if (groupIndex === 1) drawRowLine(yPos)
      } else if (yPos + rowH > maxY) {
        startNewPage()
      }
      if (isLeftGroup || isRightGroup) {
        doc.setFillColor(...COLORS.groupBg)
        doc.rect(PAGE.marginLeft, yPos, usableWidth, rowH, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(fonts.group)
        doc.setTextColor(...COLORS.groupText)
        if (leftRow?.type === 'group') doc.text(leftRow.label!, PAGE.marginLeft + colWidth / 2, yPos + rowH / 2 + 1, { align: 'center' })
        if (rightRow?.type === 'group') doc.text(rightRow.label!, rightColStart + colWidth / 2, yPos + rowH / 2 + 1, { align: 'center' })
        firstProductRowDone = false
      } else {
        const skipTop = !firstProductRowDone
        if (leftRow?.item) drawBackshopItem(leftRow.item, PAGE.marginLeft, yPos, skipTop)
        if (rightRow?.item) drawBackshopItem(rightRow.item, rightColStart, yPos, skipTop)
        firstProductRowDone = true
        drawCenterDivider(yPos, yPos + rowH)
      }
      drawRowLine(yPos + rowH)
      yPos += rowH
      if (groupIndex === 1 && (isLeftGroup || isRightGroup)) tableStartY = yPos
    }
  }

  drawCenterDivider(tableStartY, yPos)
  drawInnerVerticalLines(tableStartY, yPos)
  drawOuterVerticalLines(tableStartY, yPos)
  drawFooter(currentPage)
}
