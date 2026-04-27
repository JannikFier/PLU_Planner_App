// PDF-Generator: Erstellt ein PDF-Dokument aus DisplayItem[]
// Nutzt jsPDF für ein Zwei-Spalten-Layout im A4-Format

import jsPDF from 'jspdf'
import type { DisplayItem } from '@/types/plu'
import type { Block, StoreObstBlockOrder } from '@/types/database'
import { sortBlocksWithStoreOrder } from '@/lib/block-override-utils'
import {
  getDisplayPlu,
  getDisplayNameForItem,
  getDisplayPreisForItem,
  formatPreisEur,
  groupItemsByLetter,
  groupItemsByBlock,
} from '@/lib/plu-helpers'
import {
  computeRowHeightMm,
  computeHeaderHeightMm,
  computeColumnHeaderHeightMm,
  computeGroupHeaderHeightMm,
} from '@/lib/pdf-layout-utils'
import {
  paginateNewspaperColumns,
  computeObstNewspaperHeightsMm,
  type NewspaperPage,
  OBST_PDF_LEGEND_BOTTOM_RESERVED_MM,
} from '@/lib/newspaper-column-pages'
import type { MegaphonePdfRaster } from '@/lib/pdf-megaphone-raster'
import { loadMegaphoneIconRaster } from '@/lib/pdf-megaphone-raster'

/** 1 pt → mm (PDF) */
const PT_TO_MM = 25.4 / 72

/** Breite des Megafon-Slots in mm (quadratisch, wie Lucide-Raster); muss zu drawMegaphoneIcon passen. */
function getMegaphoneIconWidthMm(heightMm: number): number {
  const h = Math.max(2.2, heightMm)
  return h + 0.12
}

/**
 * Megafon: eingebettetes PNG (Lucide-Pfade) wie in der App; Fallback dicke Vektorlinien.
 * Reine jsPDF-Linien sind in manchen Viewern unsichtbar oder fehlerhaft.
 */
function drawMegaphoneIcon(
  doc: jsPDF,
  leftMm: number,
  centerYMm: number,
  heightMm: number,
  raster: MegaphonePdfRaster | null,
): number {
  const h = Math.max(2.2, heightMm)
  const top = centerYMm - h / 2
  if (raster?.dataUrl) {
    try {
      doc.addImage(raster.dataUrl, 'PNG', leftMm, top, h, h)
      return h + 0.12
    } catch {
      // Fallback
    }
  }
  doc.setDrawColor(153, 27, 27)
  doc.setLineWidth(0.35)
  const bodyW = h * 0.62
  const xL = leftMm + (h - bodyW) / 2
  const xR = xL + bodyW
  const midY = centerYMm
  const leftTop = midY - h * 0.32
  const leftBot = midY + h * 0.32
  const rightTop = midY - h * 0.42
  const rightBot = midY + h * 0.42
  doc.line(xL, leftTop, xL, leftBot)
  doc.line(xL, leftTop, xR, rightTop)
  doc.line(xR, rightTop, xR, rightBot)
  doc.line(xR, rightBot, xL, leftBot)
  const xIn = xL + bodyW * 0.28
  doc.line(xIn, midY - h * 0.28, xIn, midY + h * 0.28)
  return h + 0.12
}

/** Kuerzt einen Text mit binaerer Suche, sodass er inkl. Ellipsis in maxWidth passt. */
function truncateWithBinarySearch(doc: jsPDF, text: string, maxWidth: number): string {
  const ellipsis = '…'
  if (doc.getTextWidth(text) <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1
    if (doc.getTextWidth(text.slice(0, mid) + ellipsis) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + ellipsis
}

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
  // Zentrale Obst-Werbung: Namensspalte (nicht PLU) – PDF etwas kräftiger als Screen, damit Legende unterscheidbar
  obstOfferNameWeekBg: [251, 219, 96] as [number, number, number],
  obstOfferNameWeekText: [133, 77, 14] as [number, number, number],
  /** 3-Tage-Preis: dunkles Gold (nicht hellgelb), gut erkennbar auf hellem Kasten + zu PLU-Neu */
  obstOfferName3dayBg: [251, 191, 36] as [number, number, number],
  obstOfferName3dayText: [100, 50, 10] as [number, number, number],
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

/** px aus Planner → pt für PDF (ungefährer Faktor 0.75 ≈ 72/96) */
function pxToPt(px: number): number {
  return Math.round(px * 0.75)
}

/** Inhalt für Obst- und Backshop-PDF-Export (volle Liste mit/ohne Angebots-Hinweise in der Darstellung, oder nur Angebote) */
export type PdfExportContentMode = 'full_with_offers' | 'full_without_offers' | 'offers_only'

interface PDFGeneratorInput {
  items: DisplayItem[]
  kwLabel: string
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  /** Obst: Markt-Reihenfolge – gleiche Logik wie PLUTable / `buildDisplayList` */
  obstStoreBlockOrder?: StoreObstBlockOrder[]
  /** Schriftgrößen aus Layout-Einstellungen (optional) */
  fontSizes?: { header: number; column: number; product: number }
  exportMode?: PdfExportContentMode
}

/** Einzelne Zeile im PDF (Item oder Gruppen-Header) */
interface PDFRow {
  type: 'group' | 'item'
  label?: string
  item?: DisplayItem
}

/** Zeilen im Backshop (1 Zeile = bis zu 2 Items) bis zur nächsten Gruppe – für Seitenumbruch vor Warengruppe. */
function countItemPairRowsInGroupForward(rows: PDFRow[], groupRowIndex: number): number {
  let itemCount = 0
  for (let k = groupRowIndex + 1; k < rows.length; k++) {
    if (rows[k].type === 'group') break
    if (rows[k].type === 'item' && rows[k].item) itemCount++
  }
  return Math.ceil(itemCount / 2)
}

/**
 * Vor einer neuen Warengruppe (Backshop, zeilenweise): neue Seite, wenn die Gruppe nicht vollständig
 * in den Rest der Seite passt – außer am „frischen“ Tabellenanfang (noch keine andere Gruppe mit Zeilen auf dieser Seite).
 *
 * | Situation | Umbruch? |
 * | Komplette Gruppe passt in Rest | Nein |
 * | Passt nicht + schon Zeilen einer vorigen Gruppe auf dieser Seite | Ja (Lücke) |
 * | Passt nicht + Tabellenstart: einseitige Gruppe | Ja |
 * | Passt nicht + Tabellenstart: mehrseitige Gruppe | Nur wenn Kopf+Köpfe+1. Zeile nicht in Rest |
 */
function shouldInsertPageBeforeBackshopGroup(params: {
  yPos: number
  maxY: number
  marginTop: number
  groupBlockHeight: number
  minStartOfGroupHeight: number
  hasPriorGroupItemsOnThisPage: boolean
}): boolean {
  const { yPos, maxY, marginTop, groupBlockHeight, minStartOfGroupHeight, hasPriorGroupItemsOnThisPage } = params
  const remainder = maxY - yPos
  const fullPageBodyHeight = maxY - marginTop

  if (groupBlockHeight <= remainder) {
    return false
  }

  if (hasPriorGroupItemsOnThisPage) {
    return true
  }

  if (groupBlockHeight > fullPageBodyHeight) {
    return minStartOfGroupHeight > remainder
  }
  return true
}

/**
 * Erzeugt ein PDF-Dokument mit der PLU-Liste.
 * Zwei-Spalten-Layout, Farbmarkierungen, Seitenumbrüche, Footer.
 */
export function generatePDF(input: PDFGeneratorInput): jsPDF {
  const megaphoneRaster = loadMegaphoneIconRaster()
  const {
    items: rawItems,
    kwLabel,
    displayMode,
    sortMode,
    flowDirection,
    blocks,
    obstStoreBlockOrder,
    fontSizes: inputFonts,
    exportMode = 'full_with_offers',
  } = input
  let items = rawItems
  if (exportMode === 'offers_only') {
    items = rawItems
      .filter((i) => i.is_offer)
      .sort((a, b) =>
        getDisplayNameForItem(a.display_name, a.system_name, a.is_custom).localeCompare(
          getDisplayNameForItem(b.display_name, b.system_name, b.is_custom),
          'de',
        ),
      )
  }
  const showOfferHints = exportMode !== 'full_without_offers'
  const PDF_FONTS: PDFFontSizes & { group: number } = inputFonts
    ? {
        header: Math.max(10, Math.min(38, pxToPt(inputFonts.header))),
        column: Math.max(6, Math.min(36, pxToPt(inputFonts.column))),
        product: Math.max(5, Math.min(18, pxToPt(inputFonts.product))),
        group: Math.max(6, Math.min(36, pxToPt(inputFonts.column))),
      }
    : { ...DEFAULT_PDF_FONTS, group: 9 } as PDFFontSizes & { group: number }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Datum für Footer
  const dateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const mainTitle = exportMode === 'offers_only' ? `Aktuelle Angebote – ${kwLabel}` : kwLabel

  // SEPARATED: Zwei Durchläufe (Stück + Gewicht)
  if (displayMode === 'SEPARATED') {
    const pieceItems = items.filter((i) => i.item_type === 'PIECE')
    const weightItems = items.filter((i) => i.item_type === 'WEIGHT')

    if (pieceItems.length > 0) {
      const piecePDFRows = buildPDFRows(pieceItems, sortMode, blocks, obstStoreBlockOrder)
      renderSection(doc, piecePDFRows, `${mainTitle} – Stück`, dateStr, kwLabel, flowDirection, PDF_FONTS, megaphoneRaster, showOfferHints)
    }

    if (weightItems.length > 0) {
      if (pieceItems.length > 0) doc.addPage()
      const weightPDFRows = buildPDFRows(weightItems, sortMode, blocks, obstStoreBlockOrder)
      renderSection(doc, weightPDFRows, `${mainTitle} – Gewicht`, dateStr, kwLabel, flowDirection, PDF_FONTS, megaphoneRaster, showOfferHints)
    }
  } else {
    // MIXED: Ein Durchlauf
    const pdfRows = buildPDFRows(items, sortMode, blocks, obstStoreBlockOrder)
    renderSection(doc, pdfRows, mainTitle, dateStr, kwLabel, flowDirection, PDF_FONTS, megaphoneRaster, showOfferHints)
  }

  return doc
}

/** Baut die flache Zeilen-Liste für das PDF (Gruppen-Header + Items) */
function buildPDFRows(
  items: DisplayItem[],
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK',
  blocks: Block[],
  obstStoreBlockOrder?: StoreObstBlockOrder[],
): PDFRow[] {
  const rows: PDFRow[] = []

  if (sortMode === 'BY_BLOCK') {
    const sortedBlocks =
      obstStoreBlockOrder !== undefined
        ? sortBlocksWithStoreOrder(blocks, obstStoreBlockOrder)
        : [...blocks].sort((a, b) => a.order_index - b.order_index)
    const groups = groupItemsByBlock(items, blocks, { sortedBlocks: sortedBlocks })
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

/** PDF-Zeilen → Gruppen mit Items (für Spalten-Zeitung) */
function pdfRowsToItemGroups(rows: PDFRow[]): { label: string; items: DisplayItem[] }[] {
  const groups: { label: string; items: DisplayItem[] }[] = []
  for (const r of rows) {
    if (r.type === 'group') {
      groups.push({ label: r.label ?? '', items: [] })
    } else if (r.type === 'item' && r.item) {
      const g = groups[groups.length - 1]
      if (g) g.items.push(r.item)
    }
  }
  return groups
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
  megaphoneRaster: MegaphonePdfRaster | null,
  showOfferHints = true,
): number {
  const usableWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight
  const colWidth = (usableWidth - PAGE.columnGap) / 2
  const pluColWidth = 18   // PLU-Spalte Breite
  const preisColWidth = 16 // Preis-Spalte (wie PLU, hinten)
  const nameColWidth = colWidth - pluColWidth - preisColWidth

  const rightColStart = PAGE.marginLeft + colWidth + PAGE.columnGap
  const centerDividerX = PAGE.marginLeft + colWidth  // Strich zwischen linker und rechter Spalte

  // Layout-Höhen aus Schriftgrößen ableiten (proportional skalierend)
  const layout = {
    rowHeight: computeRowHeightMm(fonts.product),
    headerHeight: computeHeaderHeightMm(fonts.header),
    columnHeaderH: computeColumnHeaderHeightMm(fonts.column),
    groupHeaderH: computeGroupHeaderHeightMm(fonts.group),
  }

  let currentPage = 1
  let yPos = PAGE.marginTop

  // === Header-Banner ===
  function drawHeader() {
    doc.setFillColor(...COLORS.headerBg)
    doc.rect(PAGE.marginLeft, yPos, usableWidth, layout.headerHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.header)
    doc.setTextColor(...COLORS.headerText)
    doc.text(title, PAGE.width / 2, yPos + layout.headerHeight / 2, { align: 'center', baseline: 'middle' })
    yPos += layout.headerHeight + 2
  }

  // === Spaltenköpfe – nur Text, KEINE vertikalen Linien (Benutzerwunsch) ===
  function drawColumnHeaders() {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.column)
    doc.setTextColor(0, 0, 0)

    const leftX = PAGE.marginLeft
    const rightX = rightColStart

    doc.text('PLU', leftX + 1, yPos + layout.columnHeaderH / 2, { baseline: 'middle' })
    doc.text('Artikel', leftX + pluColWidth + 1, yPos + layout.columnHeaderH / 2, { baseline: 'middle' })

    doc.text('PLU', rightX + 1, yPos + layout.columnHeaderH / 2, { baseline: 'middle' })
    doc.text('Artikel', rightX + pluColWidth + 1, yPos + layout.columnHeaderH / 2, { baseline: 'middle' })

    // Nur horizontale Linie unter den Köpfen (keine vertikalen Striche)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.6)
    doc.line(PAGE.marginLeft, yPos + layout.columnHeaderH, PAGE.marginLeft + usableWidth, yPos + layout.columnHeaderH)
    yPos += layout.columnHeaderH + 1
  }

  /** Legende unten auf der Seite (eine Zeile, weniger Höhe), nicht unter den Spaltenköpfen */
  function drawObstOfferLegendBottom(footerLineY: number) {
    const boxH = OBST_PDF_LEGEND_BOTTOM_RESERVED_MM - 2.2
    const top = footerLineY - boxH - 2.2
    const x0 = PAGE.marginLeft
    doc.setFillColor(248, 248, 248)
    doc.rect(x0, top, usableWidth, boxH, 'F')
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.25)
    doc.rect(x0, top, usableWidth, boxH, 'S')

    const yMid = top + boxH / 2
    let cx = x0 + 1.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.2)

    const dot = (fill: [number, number, number], x: number, y: number) => {
      doc.setFillColor(...fill)
      doc.setDrawColor(170, 170, 170)
      doc.setLineWidth(0.12)
      doc.rect(x, y - 1.1, 2.2, 2.2, 'FD')
    }

    dot(COLORS.newBg, cx, yMid)
    cx += 3.2
    doc.setTextColor(55, 55, 55)
    doc.text('PLU gelb = neu', cx, yMid, { baseline: 'middle' })
    cx += doc.getTextWidth('PLU gelb = neu') + 2.5
    dot(COLORS.changedBg, cx, yMid)
    cx += 3.2
    doc.text('PLU rot = geändert', cx, yMid, { baseline: 'middle' })
    cx += doc.getTextWidth('PLU rot = geändert') + 2.5

    if (showOfferHints) {
      dot(COLORS.obstOfferNameWeekBg, cx, yMid)
      cx += 3.2
      doc.setTextColor(...COLORS.obstOfferNameWeekText)
      doc.text('Artikelname gelb = zentrale Werbung (Woche)', cx, yMid, { baseline: 'middle' })
      cx += doc.getTextWidth('Artikelname gelb = zentrale Werbung (Woche)') + 2.5
      doc.setTextColor(55, 55, 55)
      dot(COLORS.obstOfferName3dayBg, cx, yMid)
      cx += 3.2
      doc.setTextColor(...COLORS.obstOfferName3dayText)
      doc.text('Artikelname dunkelgelb = 3-Tage-Preis (Do–Sa)', cx, yMid, { baseline: 'middle' })
    }
    doc.setTextColor(0, 0, 0)
  }

  // === Footer ===
  function drawFooter(pageNum: number) {
    const footerY = PAGE.height - PAGE.marginBottom + 3
    drawObstOfferLegendBottom(footerY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.text(kwLabel, PAGE.marginLeft, footerY)
    doc.text(`${dateStr}  |  Seite ${pageNum}`, PAGE.width - PAGE.marginRight, footerY, { align: 'right' })
  }

  // === Neue Seite starten ===
  function startNewPage() {
    drawFooter(currentPage)
    doc.addPage()
    currentPage++
    yPos = PAGE.marginTop
    drawColumnHeaders()
  }

  // Zebra-Striping (vor drawItem aufrufen); optional nur eine Tabellenhälfte (Spaltenweise)
  function drawRowZebraBackground(
    y: number,
    rowHeight: number,
    rowIndex: number,
    x?: number,
    width?: number,
  ) {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.zebraLight)
      const x0 = x ?? PAGE.marginLeft
      const w0 = width ?? usableWidth
      doc.rect(x0, y, w0, rowHeight, 'F')
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
    const displayPreis = getDisplayPreisForItem(item)
    const hasPreisCol = displayPreis != null

    // Strich zwischen PLU und Artikel (immer); Strich vor Preis wenn Anzeige-Preis vorhanden
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(x + pluColWidth, y, x + pluColWidth, y + layout.rowHeight)
    if (hasPreisCol) {
      doc.line(x + pluColWidth + nameColWidth, y, x + pluColWidth + nameColWidth, y + layout.rowHeight)
    }

    // PLU-Zelle mit Statusfarbe + S/W-taugliche Markierungen (Rahmen)
    if (item.status === 'NEW_PRODUCT_YELLOW') {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(x, y, pluColWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.newText)
      // S/W: gestrichelter Rahmen
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      const dashLen = 0.8
      const gapLen = 0.6
      // Oben
      for (let dx = 0; dx < pluColWidth; dx += dashLen + gapLen) {
        doc.line(x + dx, y, x + Math.min(dx + dashLen, pluColWidth), y)
      }
      // Unten
      for (let dx = 0; dx < pluColWidth; dx += dashLen + gapLen) {
        doc.line(x + dx, y + layout.rowHeight, x + Math.min(dx + dashLen, pluColWidth), y + layout.rowHeight)
      }
      // Links
      for (let dy = 0; dy < layout.rowHeight; dy += dashLen + gapLen) {
        doc.line(x, y + dy, x, y + Math.min(dy + dashLen, layout.rowHeight))
      }
      // Rechts
      for (let dx2 = x + pluColWidth; dx2 === x + pluColWidth; dx2++) {
        for (let dy = 0; dy < layout.rowHeight; dy += dashLen + gapLen) {
          doc.line(dx2, y + dy, dx2, y + Math.min(dy + dashLen, layout.rowHeight))
        }
      }
    } else if (item.status === 'PLU_CHANGED_RED') {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(x, y, pluColWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.changedText)
      // S/W: fetter Rahmen
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.7)
      doc.rect(x, y, pluColWidth, layout.rowHeight, 'S')
    } else {
      doc.setTextColor(0, 0, 0)
    }

    // PLU
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.product)
    doc.text(getDisplayPlu(item.plu), x + 1, y + layout.rowHeight / 2, { baseline: 'middle' })

    // Namensspalte: zentrale Obst-Werbung (Hintergrund, nicht PLU-Spalte)
    const nameX = x + pluColWidth
    if (item.offer_name_highlight_kind === 'ordersatz_3day') {
      doc.setFillColor(...COLORS.obstOfferName3dayBg)
      doc.rect(nameX, y, nameColWidth, layout.rowHeight, 'F')
    } else if (item.offer_name_highlight_kind) {
      doc.setFillColor(...COLORS.obstOfferNameWeekBg)
      doc.rect(nameX, y, nameColWidth, layout.rowHeight, 'F')
    }

    // Artikelname – volle Namensspalte (Angebot: Megafon + Preis in der Preis-Spalte)
    if (item.offer_name_highlight_kind === 'ordersatz_3day') {
      doc.setTextColor(...COLORS.obstOfferName3dayText)
    } else if (item.offer_name_highlight_kind) {
      doc.setTextColor(...COLORS.obstOfferNameWeekText)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    const displayName = getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
    const maxNameWidth = nameColWidth - 2
    const nameToDraw = truncateWithBinarySearch(doc, displayName, maxNameWidth)
    doc.text(nameToDraw, x + pluColWidth + 1, y + layout.rowHeight / 2, { baseline: 'middle' })
    doc.setTextColor(0, 0, 0)

    // Preis-Spalte (Kasten wie PLU, gelbe Markierung bei neuem Produkt)
    const preisX = x + pluColWidth + nameColWidth
    if (item.status === 'NEW_PRODUCT_YELLOW' && hasPreisCol) {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(preisX, y, preisColWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.newText)
    } else if (item.status === 'PLU_CHANGED_RED' && hasPreisCol) {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(preisX, y, preisColWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.changedText)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    if (hasPreisCol) {
      const cy = y + layout.rowHeight / 2
      const iconH = Math.min(3.8, layout.rowHeight * 0.48)
      const offerStyle = item.is_offer && showOfferHints
      doc.setFont('helvetica', offerStyle ? 'bold' : 'normal')
      doc.setFontSize(offerStyle ? Math.min(fonts.product + 1, 12) : fonts.product)
      const priceStr = formatPreisEur(displayPreis!)
      if (offerStyle) {
        doc.setTextColor(153, 27, 27)
        const priceW = doc.getTextWidth(priceStr)
        const iconW = getMegaphoneIconWidthMm(iconH)
        const gap = 0.45
        const totalW = iconW + gap + priceW
        const blockLeft = preisX + preisColWidth / 2 - totalW / 2
        drawMegaphoneIcon(doc, blockLeft, cy, iconH, megaphoneRaster)
        doc.text(priceStr, blockLeft + iconW + gap, cy, { baseline: 'middle' })
        doc.setTextColor(0, 0, 0)
      } else {
        doc.text(priceStr, preisX + 1, cy, { baseline: 'middle' })
      }
      doc.setFont('helvetica', 'normal')
    }
  }

  // Gruppen-Header: Hintergrund für ganze Zeile (vor dem Text), dann Text zentriert in Spalte
  function drawGroupHeaderFullRow(y: number) {
    doc.setFillColor(...COLORS.groupBg)
    doc.rect(PAGE.marginLeft, y, usableWidth, layout.groupHeaderH, 'F')
  }

  function drawGroupHeaderLabel(label: string, x: number, y: number, width: number) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.group)
    doc.setTextColor(...COLORS.groupText)
    doc.text(label, x + width / 2, y + layout.groupHeaderH / 2, { align: 'center', baseline: 'middle' })
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

  const maxY =
    PAGE.height - PAGE.marginBottom - PAGE.footerHeight - OBST_PDF_LEGEND_BOTTOM_RESERVED_MM

  if (flowDirection === 'ROW_BY_ROW') {
    // ROW_BY_ROW: Items paarweise (1→links, 2→rechts, 3→links...)
    let rowIndex = 0
    let i = 0

    while (i < pdfRows.length) {
      const row = pdfRows[i]

      if (row.type === 'group') {
        if (yPos + layout.groupHeaderH > maxY) startNewPage()
        drawGroupHeader(row.label ?? '', PAGE.marginLeft, yPos, usableWidth)
        drawRowLine(yPos + layout.groupHeaderH)
        yPos += layout.groupHeaderH
        rowIndex = 0
        i++
        continue
      }

      if (yPos + layout.rowHeight > maxY) startNewPage()

      const leftItem = row.item
      if (!leftItem) { i++; continue }
      const leftX = PAGE.marginLeft
      const rightX = rightColStart

      drawRowZebraBackground(yPos, layout.rowHeight, rowIndex)
      drawItem(leftItem, leftX, yPos)

      const nextRow = pdfRows[i + 1]
      if (i + 1 < pdfRows.length && nextRow?.type === 'item' && nextRow.item) {
        drawItem(nextRow.item, rightX, yPos)
        drawCenterDivider(yPos, yPos + layout.rowHeight)
        i += 2
      } else {
        drawCenterDivider(yPos, yPos + layout.rowHeight)
        i++
      }

      drawRowLine(yPos + layout.rowHeight)
      yPos += layout.rowHeight
      rowIndex++
    }
  } else {
    // COLUMN_FIRST: Zeitungslayout – linke Spalte oben→unten, dann rechte Spalte, dann neue Seite
    const itemGroups = pdfRowsToItemGroups(pdfRows)
    const npHeights = computeObstNewspaperHeightsMm({
      header: fonts.header,
      column: fonts.column,
      product: fonts.product,
      group: fonts.group,
    })
    const newsPages = paginateNewspaperColumns(itemGroups, npHeights.heights)

    /** Spalten-Zeitung: gleiche Zeilenhöhe und Produkt-Schrift für Buchstaben-Header */
    function drawGroupHeaderHalfColumnNewspaper(label: string, xCol: number, y: number) {
      doc.setFillColor(...COLORS.groupBg)
      doc.rect(xCol, y, colWidth, layout.rowHeight, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(fonts.product)
      doc.setTextColor(...COLORS.groupText)
      doc.text(label, xCol + colWidth / 2, y + layout.rowHeight / 2, {
        align: 'center',
        baseline: 'middle',
      })
    }

    function renderNewspaperObstPage(page: NewspaperPage<DisplayItem>, yStart: number): number {
      const leftX = PAGE.marginLeft
      let yL = yStart
      let yR = yStart
      let zebraL = 0
      let zebraR = 0
      const rh = layout.rowHeight

      for (const row of page.left) {
        if (row.type === 'group') {
          drawGroupHeaderHalfColumnNewspaper(row.label, leftX, yL)
        } else {
          drawRowZebraBackground(yL, rh, zebraL, leftX, colWidth)
          drawItem(row.item, leftX, yL)
          zebraL++
        }
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.4)
        doc.line(leftX, yL + rh, centerDividerX, yL + rh)
        yL += rh
      }

      for (const row of page.right) {
        if (row.type === 'group') {
          drawGroupHeaderHalfColumnNewspaper(row.label, rightColStart, yR)
        } else {
          drawRowZebraBackground(yR, rh, zebraR, rightColStart, colWidth)
          drawItem(row.item, rightColStart, yR)
          zebraR++
        }
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.4)
        doc.line(centerDividerX, yR + rh, PAGE.marginLeft + usableWidth, yR + rh)
        yR += rh
      }

      const bottom = Math.max(yL, yR)
      while (yL < bottom) {
        const h = Math.min(rh, bottom - yL)
        drawRowZebraBackground(yL, h, zebraL, leftX, colWidth)
        zebraL++
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.4)
        doc.line(leftX, yL + h, centerDividerX, yL + h)
        yL += h
      }
      while (yR < bottom) {
        const h = Math.min(rh, bottom - yR)
        drawRowZebraBackground(yR, h, zebraR, rightColStart, colWidth)
        zebraR++
        doc.line(centerDividerX, yR + h, PAGE.marginLeft + usableWidth, yR + h)
        yR += h
      }

      drawCenterDivider(yStart, bottom)
      return bottom
    }

    for (let pi = 0; pi < newsPages.length; pi++) {
      if (pi > 0) {
        startNewPage()
      }
      const yStart = yPos
      yPos = renderNewspaperObstPage(newsPages[pi], yStart)
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
      lastGroupLabel = row.label ?? null
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
/** PLU-Spalte: genug für 5 Stellen + Produkt-Schrift ohne „…“ (mm). */
const BACKSHOP_PLU_WIDTH = 22
/** Innenabstand in der PLU-Zelle (links und rechts). */
const BACKSHOP_PLU_PADDING = 1.2
/** Zusätzlicher Abstand zwischen PLU-Spalte und Namen (mm). */
const BACKSHOP_PLU_NAME_GAP = 2.2
/** Vertikaler Abstand zwischen zwei Warengruppen auf derselben Seite (mm). */
const BACKSHOP_GAP_BETWEEN_GROUPS_MM = 4
/**
 * Zuschlag auf die geschätzte Warengruppen-Höhe (mm), damit die nächste Gruppe nur startet,
 * wenn sie wirklich vollständig in den Seitenrest passt (Rundung/Schrift).
 */
const BACKSHOP_GROUP_BLOCK_PAD_MM = 6

export interface GenerateBackshopPDFInput {
  items: DisplayItem[]
  kwLabel: string
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  fontSizes?: { header: number; column: number; product: number }
  exportMode?: PdfExportContentMode
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
  const {
    items: rawItems,
    kwLabel,
    sortMode,
    flowDirection,
    blocks,
    fontSizes: inputFonts,
    exportMode = 'full_with_offers',
  } = input
  let items = rawItems
  if (exportMode === 'offers_only') {
    items = rawItems
      .filter((i) => i.is_offer)
      .sort((a, b) =>
        getDisplayNameForItem(a.display_name, a.system_name, a.is_custom).localeCompare(
          getDisplayNameForItem(b.display_name, b.system_name, b.is_custom),
          'de',
        ),
      )
  }
  const showOfferHints = exportMode !== 'full_without_offers'
  // Titel 32pt, Warengruppen (z. B. Brot) 24pt, Spalten/Produkte 18pt
  const fonts: PDFFontSizes & { group: number } = inputFonts
    ? {
        header: Math.max(10, Math.min(38, pxToPt(inputFonts.header))),
        column: Math.max(6, Math.min(36, pxToPt(inputFonts.column))),
        product: Math.max(5, Math.min(20, pxToPt(inputFonts.product))),
        group: Math.max(6, Math.min(36, pxToPt(inputFonts.column))),
      }
    : { ...DEFAULT_PDF_FONTS, group: 10 } as PDFFontSizes & { group: number }

  const imageDataUrls = new Map<string, { dataUrl: string; width: number; height: number }>()
  const urlsToLoad = items.flatMap((i) => (i.image_url ? [{ id: i.id, url: i.image_url }] : []))
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
  const mainHeader =
    exportMode === 'offers_only' ? 'Aktuelle Angebote Backshop' : 'PLU-Liste Backshop'
  const megaphoneRaster = loadMegaphoneIconRaster()
  renderBackshopSection(
    doc,
    pdfRows,
    dateStr,
    kwLabel,
    flowDirection,
    fonts,
    imageDataUrls,
    mainHeader,
    exportMode,
    megaphoneRaster,
    showOfferHints,
  )
  return doc
}

/** Rendert Backshop-Sektion: Header „PLU-Liste Backshop“, Zeilen Bild | PLU | Name, Footer. */
function renderBackshopSection(
  doc: jsPDF,
  pdfRows: PDFRow[],
  dateStr: string,
  kwLabel: string,
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST',
  fontsIn: PDFFontSizes & { group: number },
  imageDataUrls: Map<string, { dataUrl: string; width: number; height: number }>,
  mainHeaderLine = 'PLU-Liste Backshop',
  exportMode: PdfExportContentMode = 'full_with_offers',
  megaphoneRaster: MegaphonePdfRaster | null = null,
  showOfferHints = true,
): void {
  const fonts =
    exportMode === 'offers_only'
      ? { ...fontsIn, product: Math.max(6, fontsIn.product - 1) }
      : fontsIn

  const usableWidth = PAGE.width - PAGE.marginLeft - PAGE.marginRight
  const colWidth = (usableWidth - PAGE.columnGap) / 2

  // Layout-Höhen aus Schriftgrößen; Zeilenhöhe mind. 22mm für Bilder (Angebots-PDF etwas kompakter)
  const fontBasedRowHeight = computeRowHeightMm(fonts.product)
  let rowHeight = Math.max(BACKSHOP_ROW_HEIGHT, fontBasedRowHeight)
  if (exportMode === 'offers_only') {
    rowHeight = Math.max(17, rowHeight - 4)
  }
  const imageSize = Math.min(BACKSHOP_IMAGE_SIZE, rowHeight - 1)
  const pluWidth = BACKSHOP_PLU_WIDTH
  const nameWidth = colWidth - imageSize - pluWidth - BACKSHOP_PLU_NAME_GAP - 2

  const layout = {
    rowHeight,
    headerHeight: computeHeaderHeightMm(fonts.header),
    columnHeaderH: computeColumnHeaderHeightMm(fonts.column),
    groupHeaderH: computeGroupHeaderHeightMm(fonts.group),
  }

  const rightColStart = PAGE.marginLeft + colWidth + PAGE.columnGap
  const centerDividerX = PAGE.marginLeft + colWidth
  let currentPage = 1
  let yPos = PAGE.marginTop
  let tableStartY = PAGE.marginTop
  function drawHeader() {
    doc.setFillColor(...COLORS.headerBg)
    doc.rect(PAGE.marginLeft, yPos, usableWidth, layout.headerHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.header)
    doc.setTextColor(...COLORS.headerText)
    doc.text(mainHeaderLine, PAGE.width / 2, yPos + layout.headerHeight / 2, { align: 'center', baseline: 'middle' })
    yPos += layout.headerHeight + 2
  }

  let firstTableGridY: number | null = null
  /** Auf der aktuellen Seite schon mindestens eine Artikelzeile (Paar) einer Warengruppe gezeichnet – relevant für Umbruch vor der nächsten Gruppe. */
  let hasPriorGroupItemsOnThisPage = false

  function drawColumnHeaders() {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.column)
    doc.setTextColor(0, 0, 0)
    const leftX = PAGE.marginLeft
    const rightX = rightColStart
    const headerH = layout.columnHeaderH
    const yHeaderStart = yPos
    if (firstTableGridY === null) firstTableGridY = yPos
    doc.text('Bild', leftX + 1, yPos + headerH / 2, { baseline: 'middle' })
    doc.text('PLU', leftX + imageSize + 1 + BACKSHOP_PLU_PADDING, yPos + headerH / 2, { baseline: 'middle' })
    doc.text('Name', leftX + imageSize + 1 + pluWidth + BACKSHOP_PLU_NAME_GAP + 0.5, yPos + headerH / 2, { baseline: 'middle' })
    doc.text('Bild', rightX + 1, yPos + headerH / 2, { baseline: 'middle' })
    doc.text('PLU', rightX + imageSize + 1 + BACKSHOP_PLU_PADDING, yPos + headerH / 2, { baseline: 'middle' })
    doc.text('Name', rightX + imageSize + 1 + pluWidth + BACKSHOP_PLU_NAME_GAP + 0.5, yPos + headerH / 2, { baseline: 'middle' })
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(PAGE.marginLeft, yPos + headerH, PAGE.marginLeft + usableWidth, yPos + headerH)
    drawBackshopRowVerticalSegments(yHeaderStart, yHeaderStart + headerH)
    yPos += headerH + 1
  }

  /** Vertikale Tabellenlinien für eine Zeile (Bild|PLU|Name | Bild|PLU|Name). */
  function drawBackshopRowVerticalSegments(yTop: number, yBottom: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.35)
    const leftX = PAGE.marginLeft
    const rightX = rightColStart
    const xs = [
      leftX + imageSize + 1,
      leftX + imageSize + 1 + pluWidth,
      centerDividerX,
      ...(Math.abs(rightColStart - centerDividerX) > 0.05 ? [rightColStart] : []),
      rightX + imageSize + 1,
      rightX + imageSize + 1 + pluWidth,
    ]
    for (const xv of xs) {
      doc.line(xv, yTop, xv, yBottom)
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
    const outerTop = firstTableGridY ?? tableStartY
    drawOuterVerticalLines(outerTop, yPos)
    drawFooter(currentPage)
    doc.addPage()
    currentPage++
    firstTableGridY = null
    hasPriorGroupItemsOnThisPage = false
    yPos = PAGE.marginTop
    if (groupLabel != null && groupLabel !== '') {
      drawGroupHeader(groupLabel, yPos)
      drawRowLine(yPos + layout.groupHeaderH)
      tableStartY = yPos + layout.groupHeaderH
      yPos += layout.groupHeaderH
      yPos += 1.5
      drawColumnHeaders()
    }
  }

  function drawRowLine(y: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(PAGE.marginLeft, y, PAGE.marginLeft + usableWidth, y)
  }

  /** Vertikale Linien links und rechts der Tabelle (klare Tabellenstruktur). */
  function drawOuterVerticalLines(yStart: number, yEnd: number) {
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.4)
    doc.line(PAGE.marginLeft, yStart, PAGE.marginLeft, yEnd)
    doc.line(PAGE.marginLeft + usableWidth, yStart, PAGE.marginLeft + usableWidth, yEnd)
  }

  /** Nur Inhalt; Raster kommt aus Vertikalen + Zeilenlinien (keine doppelten Zellrahmen). */
  function drawBackshopItem(item: DisplayItem, x: number, y: number) {
    const imageInfo = item.id ? imageDataUrls.get(item.id) : null
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
        doc.text('Bild', x + (imageSize + 1) / 2, y + layout.rowHeight / 2, { align: 'center', baseline: 'middle' })
      }
    } else {
      doc.setFontSize(6)
      doc.setTextColor(128, 128, 128)
      doc.text('–', x + (imageSize + 1) / 2, y + layout.rowHeight / 2, { align: 'center', baseline: 'middle' })
      doc.setTextColor(0, 0, 0)
    }

    const pluX = x + imageSize + 1
    if (item.status === 'NEW_PRODUCT_YELLOW') {
      doc.setFillColor(...COLORS.newBg)
      doc.rect(pluX, y, pluWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.newText)
    } else if (item.status === 'PLU_CHANGED_RED') {
      doc.setFillColor(...COLORS.changedBg)
      doc.rect(pluX, y, pluWidth, layout.rowHeight, 'F')
      doc.setTextColor(...COLORS.changedText)
    } else {
      doc.setTextColor(0, 0, 0)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fonts.product)
    const pluStr = getDisplayPlu(item.plu)
    const pluMaxW = pluWidth - 2 * BACKSHOP_PLU_PADDING - 0.2
    const pluDraw =
      doc.getTextWidth(pluStr) <= pluMaxW ? pluStr : truncateWithBinarySearch(doc, pluStr, pluMaxW)
    doc.text(pluDraw, pluX + BACKSHOP_PLU_PADDING, y + layout.rowHeight / 2, { baseline: 'middle' })
    doc.setTextColor(0, 0, 0)

    const nameX = pluX + pluWidth + BACKSHOP_PLU_NAME_GAP
    const nameStartX = nameX + 0.5
    const nameTextW = nameWidth - 1
    const nameColRight = x + colWidth - 0.6
    const nameColCenterX = (nameStartX + nameColRight) / 2
    const displayName = getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
    const displayPreis = getDisplayPreisForItem(item)

    if (!item.is_offer || !showOfferHints) {
      const nameToDraw = truncateWithBinarySearch(doc, displayName, nameTextW)
      doc.text(nameToDraw, nameStartX, y + layout.rowHeight / 2, { baseline: 'middle' })
    } else {
      doc.setFontSize(fonts.product)
      const nameLines = doc.splitTextToSize(displayName, nameTextW)
      const linesToShow = nameLines.slice(0, 2)
      const lineH = fonts.product * PT_TO_MM * 1.18
      let ty = y + 1.8
      linesToShow.forEach((line: string) => {
        doc.text(line, nameStartX, ty, { baseline: 'top' })
        ty += lineH
      })
      const offerLineY = y + layout.rowHeight - 3.4
      const iconH = Math.min(3.6, layout.rowHeight * 0.34)
      if (displayPreis != null) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(Math.min(fonts.product + 1, 12))
        doc.setTextColor(153, 27, 27)
        const priceStr = formatPreisEur(displayPreis)
        const priceW = doc.getTextWidth(priceStr)
        const iconW = getMegaphoneIconWidthMm(iconH)
        const gap = 0.45
        const totalW = iconW + gap + priceW
        const blockLeft = nameColCenterX - totalW / 2
        drawMegaphoneIcon(doc, blockLeft, offerLineY, iconH, megaphoneRaster)
        doc.text(priceStr, blockLeft + iconW + gap, offerLineY, { baseline: 'middle' })
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
      } else {
        doc.setFontSize(Math.max(5, fonts.product - 1))
        doc.setTextColor(120, 120, 120)
        doc.text('Preis n. v.', nameColCenterX, offerLineY, { align: 'center', baseline: 'middle' })
        doc.setTextColor(0, 0, 0)
      }
    }
  }

  function drawGroupHeader(label: string, y: number) {
    doc.setFillColor(...COLORS.groupBg)
    doc.rect(PAGE.marginLeft, y, usableWidth, layout.groupHeaderH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fonts.group)
    doc.setTextColor(...COLORS.groupText)
    doc.text(label, PAGE.marginLeft + usableWidth / 2, y + layout.groupHeaderH / 2, { align: 'center', baseline: 'middle' })
  }

  drawHeader()

  const maxY = PAGE.height - PAGE.marginBottom - PAGE.footerHeight
  let groupIndex = 0
  let currentGroupLabel: string | null = null

  if (flowDirection === 'ROW_BY_ROW') {
    let i = 0
    while (i < pdfRows.length) {
      const row = pdfRows[i]
      if (row.type === 'group') {
        /** Bei Nur-Angebote: Warengruppen-Zeile ohne erneute „Bild / PLU / Name“-Kopfzeile (spart Platz, eine Seite möglich). */
        const skipRepeatColHeaders = exportMode === 'offers_only' && groupIndex >= 1
        const colHeadExtra = skipRepeatColHeaders ? 0 : layout.columnHeaderH + 1
        const spacingAfterGroup = skipRepeatColHeaders ? 0.8 : 1.5
        const pairRows = countItemPairRowsInGroupForward(pdfRows, i)
        const groupBlockHeight =
          layout.groupHeaderH +
          spacingAfterGroup +
          colHeadExtra +
          pairRows * layout.rowHeight +
          BACKSHOP_GROUP_BLOCK_PAD_MM
        const minStartOfGroupHeight =
          layout.groupHeaderH + spacingAfterGroup + colHeadExtra + layout.rowHeight + BACKSHOP_GROUP_BLOCK_PAD_MM
        const gapBeforeGroup = groupIndex > 0 ? BACKSHOP_GAP_BETWEEN_GROUPS_MM : 0
        const yPosForGroup = yPos + gapBeforeGroup
        const needNewPage = shouldInsertPageBeforeBackshopGroup({
          yPos: yPosForGroup,
          maxY,
          marginTop: PAGE.marginTop,
          groupBlockHeight,
          minStartOfGroupHeight,
          hasPriorGroupItemsOnThisPage,
        })
        if (needNewPage) startNewPage()
        else if (gapBeforeGroup > 0) yPos += gapBeforeGroup
        groupIndex++
        currentGroupLabel = row.label ?? null
        // Linie über grauem Kasten, Warengruppe (Brot), Linie darunter; Vertikale schließen an Unterkante Brot an
        drawRowLine(yPos)
        drawGroupHeader(row.label ?? '', yPos)
        drawRowLine(yPos + layout.groupHeaderH)
        tableStartY = yPos + layout.groupHeaderH
        yPos += layout.groupHeaderH
        yPos += spacingAfterGroup
        if (!skipRepeatColHeaders) drawColumnHeaders()
        i++
        continue
      }
      if (yPos + layout.rowHeight > maxY) startNewPage(currentGroupLabel)
      const leftItem = row.item
      if (!leftItem) { i++; continue }
      drawBackshopItem(leftItem, PAGE.marginLeft, yPos)
      const nextRow = pdfRows[i + 1]
      if (i + 1 < pdfRows.length && nextRow?.type === 'item' && nextRow.item) {
        drawBackshopItem(nextRow.item, rightColStart, yPos)
        i += 2
      } else {
        i++
      }
      drawRowLine(yPos + layout.rowHeight)
      drawBackshopRowVerticalSegments(yPos, yPos + layout.rowHeight)
      yPos += layout.rowHeight
      hasPriorGroupItemsOnThisPage = true
    }
  } else {
    // Spaltenweise: Umbruch pro sichtbarer Zeile (Gruppenkopf = eine Zeile), keine vorgelagerte
    // Gesamthöhe pro Warengruppe – anders als ROW_BY_ROW; daher keine „leere erste Seite“-Logik nötig.
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
      const rowH = (isLeftGroup || isRightGroup) ? layout.groupHeaderH : layout.rowHeight
      if (isLeftGroup || isRightGroup) {
        const gapBetween = groupIndex > 0 ? BACKSHOP_GAP_BETWEEN_GROUPS_MM : 0
        const yWithGap = yPos + gapBetween
        if (yWithGap + rowH > maxY) startNewPage()
        else if (gapBetween > 0) yPos = yWithGap
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
        if (leftRow?.type === 'group') doc.text(leftRow.label ?? '', PAGE.marginLeft + colWidth / 2, yPos + rowH / 2, { align: 'center', baseline: 'middle' })
        if (rightRow?.type === 'group') doc.text(rightRow.label ?? '', rightColStart + colWidth / 2, yPos + rowH / 2, { align: 'center', baseline: 'middle' })
      } else {
        if (leftRow?.item) drawBackshopItem(leftRow.item, PAGE.marginLeft, yPos)
        if (rightRow?.item) drawBackshopItem(rightRow.item, rightColStart, yPos)
      }
      drawRowLine(yPos + rowH)
      if (!isLeftGroup && !isRightGroup) {
        drawBackshopRowVerticalSegments(yPos, yPos + rowH)
      }
      yPos += rowH
      if (groupIndex === 1 && (isLeftGroup || isRightGroup)) tableStartY = yPos
    }
  }

  const outerTopY = firstTableGridY ?? tableStartY
  drawOuterVerticalLines(outerTopY, yPos)
  drawFooter(currentPage)
}
