// PDF „Scanhilfe“ Backshop-Werbung KW: A4 quer, enge Artikelspalte, Mo–Sa-Kästchen, großer Strichcode

import type { BackshopWerbungResolvedLine } from '@/hooks/useBackshopWerbungLinesWithMaster'
import type { BackshopWerbungWeekdayQuantity } from '@/types/database'
import { barcodeDigitsOnly, barcodeToPngDataUrl } from '@/lib/backshop-barcode'
import { loadRemoteImageForPdf } from '@/lib/pdf-remote-image'
import { formatIsoWeekMondayToSundayWeekdaysDe } from '@/lib/date-kw-utils'
import { formatKWLabel, formatPreisEur, getDisplayPlu } from '@/lib/plu-helpers'

type JsPDFDoc = InstanceType<(typeof import('jspdf'))['default']>

/** Nur die Mengenfelder der Bestelltabelle (pro PLU). */
export type BackshopWerbungWeekdayQtySlice = Pick<
  BackshopWerbungWeekdayQuantity,
  'qty_mo' | 'qty_di' | 'qty_mi' | 'qty_do' | 'qty_fr' | 'qty_sa'
>

async function loadJsPDFConstructor(): Promise<(typeof import('jspdf'))['default']> {
  const { default: Ctor } = await import('jspdf')
  return Ctor
}

export interface BackshopWerbungOrderPdfMeta {
  kw: number
  jahr: number
  source_file_name?: string | null
  auslieferung_ab?: string | null
}

/** A4 quer */
const PAGE_W_MM = 297
const PAGE_H_MM = 210

const MARGIN_MM = 8
const FOOTER_SAFE_MM = 6
const HEADER_ROW_H_MM = 11
const CELL_PAD_MM = 0.8

/** Ziel: ~7 Zeilen auf erster Seite – kompakte Zeilenhöhe */
const ROW_BODY_FONT_PT = 6.5
const ROW_HEADER_FONT_PT = 6
const ROW_LINE_MM = 2.9

/** Spaltenbreiten-Baustein (mm); Mo–Sa erhalten den verbleibenden Platz gleichmäßig. */
const COL_IMG_MM = 17
const COL_PLU_MM = 8
/** Artikel höchstens so breit – vermeidet riesige „Schreibfläche“. */
const COL_ARTIKEL_MAX_MM = 48
const COL_PRICE_MM = 10.5
/** Code-Spalte für größeren Strichcode. */
const COL_CODE_MM = 27
/** Mindestbreite je Mo–Sa-Feld (Schreibkästchen). */
const COL_WD_MIN_MM = 9.5
/** Horizontale Schreiblinie in leeren Mo–Sa-Zellen: Abstand links/rechts (mm). */
const QTY_WRITE_LINE_INSET_MM = 0.35

/** Produktvorschau (links). */
const THUMB_MM = 15
/** Strichcode nutzt die Code-Spalte höher als das Bild (Lesbarkeit beim Scannen). */
const BARCODE_CELL_FILL_RATIO = 0.92

const WEEK_KEYS = ['qty_mo', 'qty_di', 'qty_mi', 'qty_do', 'qty_fr', 'qty_sa'] as const

export function buildBackshopWerbungOrderPdfFileName(kw: number, jahr: number): string {
  const kwPadded = String(Math.min(53, Math.max(1, kw))).padStart(2, '0')
  return `Werbung-KW${kwPadded}-${jahr}-Scanhilfe.pdf`
}

function formatAuslieferungDe(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return null
  }
}

function fmtEur(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '–'
  return formatPreisEur(Number(n))
}

function fmtQty(n: number | null | undefined): string {
  if (n == null) return '–'
  const s = String(n)
  return s.includes('.') ? s.replace('.', ',') : s
}

function fitImageInSquareMm(
  iw: number,
  ih: number,
  box: number,
): { drawW: number; drawH: number; xOff: number; yOff: number } {
  if (iw <= 0 || ih <= 0) {
    return { drawW: box, drawH: box, xOff: 0, yOff: 0 }
  }
  const ratio = iw / ih
  let drawW: number
  let drawH: number
  if (ratio >= 1) {
    drawW = box
    drawH = box / ratio
  } else {
    drawH = box
    drawW = box * ratio
  }
  const xOff = (box - drawW) / 2
  const yOff = (box - drawH) / 2
  return { drawW, drawH, xOff, yOff }
}

/** Strichcode maximal in Zelle (Breite/Höhe); Ziffern nur im JsBarcode-Bild (displayValue). */
function barcodeFitInCellMm(
  doc: JsPDFDoc,
  barcodeDataUrl: string | null,
  maxWMm: number,
  maxHMm: number,
): { w: number; h: number } {
  if (!barcodeDataUrl) return { w: 0, h: 0 }
  try {
    const p = doc.getImageProperties(barcodeDataUrl)
    if (p.width <= 0) return { w: maxWMm * 0.95, h: maxHMm * 0.55 }
    let w = maxWMm * BARCODE_CELL_FILL_RATIO
    let h = (p.height / p.width) * w
    if (h > maxHMm * BARCODE_CELL_FILL_RATIO) {
      h = maxHMm * BARCODE_CELL_FILL_RATIO
      w = (p.width / p.height) * h
    }
    return { w, h }
  } catch {
    return { w: maxWMm * 0.9, h: maxHMm * 0.55 }
  }
}

/** Feste Spalten + Artikel (gedeckelt); Mo–Sa teilen sich den Rest gleichmäßig. */
function buildColumnWidths(tableW: number): number[] {
  const prices = 4 * COL_PRICE_MM
  const baseFixed = COL_IMG_MM + COL_PLU_MM + prices + COL_CODE_MM
  /** Platz für Artikel nach Mindestbreiten Mo–Sa. */
  let artikel = Math.min(COL_ARTIKEL_MAX_MM, tableW - baseFixed - 6 * COL_WD_MIN_MM)
  artikel = Math.max(30, artikel)
  const remainder = tableW - baseFixed - artikel
  const wdEach = remainder / 6
  return [
    COL_IMG_MM,
    COL_PLU_MM,
    artikel,
    COL_PRICE_MM,
    COL_PRICE_MM,
    COL_PRICE_MM,
    COL_PRICE_MM,
    wdEach,
    wdEach,
    wdEach,
    wdEach,
    wdEach,
    wdEach,
    COL_CODE_MM,
  ]
}

function colXs(leftMm: number, widths: number[]): number[] {
  const xs: number[] = [leftMm]
  for (let i = 0; i < widths.length; i++) {
    xs.push(xs[i] + widths[i])
  }
  return xs
}

function estimateRowHeightMm(doc: JsPDFDoc, line: BackshopWerbungResolvedLine, widths: number[]): number {
  const wArt = widths[2] - 2 * CELL_PAD_MM
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(ROW_BODY_FONT_PT)
  const nameLines = doc.splitTextToSize(line.display_name ?? '', wArt)
  const shown = nameLines.slice(0, 3)
  const textH = CELL_PAD_MM + shown.length * ROW_LINE_MM + CELL_PAD_MM
  return Math.max(THUMB_MM + 2 * CELL_PAD_MM, textH + 2)
}

/**
 * Erzeugt das Werbungs-PDF (A4 quer) – Tabellenlayout wie die Oberfläche.
 */
export async function generateBackshopWerbungOrderPdf(
  lines: BackshopWerbungResolvedLine[],
  meta: BackshopWerbungOrderPdfMeta,
  weekdayByPlu: Map<string, BackshopWerbungWeekdayQtySlice>,
): Promise<JsPDFDoc> {
  const sorted = [...lines].sort((a, b) => a.sort_index - b.sort_index)
  const JSPDF = await loadJsPDFConstructor()
  const doc = new JSPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const tableW = PAGE_W_MM - 2 * MARGIN_MM
  const colWidths = buildColumnWidths(tableW)
  const xs = colXs(MARGIN_MM, colWidths)

  const imageByLineId = new Map<string, { dataUrl: string; width: number; height: number } | null>()
  await Promise.all(
    sorted.map(async (line) => {
      if (!line.image_url) {
        imageByLineId.set(line.lineId, null)
        return
      }
      const loaded = await loadRemoteImageForPdf(line.image_url)
      imageByLineId.set(line.lineId, loaded)
    }),
  )

  const barcodeByLineId = new Map<string, string | null>()
  for (const line of sorted) {
    const digits = barcodeDigitsOnly(line.source_art_nr)
    barcodeByLineId.set(line.lineId, digits ? barcodeToPngDataUrl(digits) : null)
  }

  const bottomLimit = () => PAGE_H_MM - MARGIN_MM - FOOTER_SAFE_MM

  const drawTitleBlock = (continuation: boolean) => {
    let yy = MARGIN_MM
    if (continuation) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(
        `Werbung ${formatKWLabel(meta.kw, meta.jahr)} – Scanhilfe (Fortsetzung)`,
        MARGIN_MM,
        yy + 4,
      )
      yy += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(60, 60, 60)
      const contRange = formatIsoWeekMondayToSundayWeekdaysDe(meta.kw, meta.jahr)
      const contLines = doc.splitTextToSize(contRange, tableW)
      let yC = yy + 3.5
      for (const cl of contLines) {
        doc.text(cl, MARGIN_MM, yC)
        yC += 3.2
      }
      doc.setTextColor(0, 0, 0)
      yy = yC + 2
      return yy
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(`Werbung ${formatKWLabel(meta.kw, meta.jahr)} – Scanhilfe`, MARGIN_MM, yy + 5)
    yy += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 55, 55)
    const weekRangeText = formatIsoWeekMondayToSundayWeekdaysDe(meta.kw, meta.jahr)
    const weekRangeLines = doc.splitTextToSize(weekRangeText, tableW)
    let yMeta = yy + 4
    for (const wl of weekRangeLines) {
      doc.text(wl, MARGIN_MM, yMeta)
      yMeta += 3.6
    }
    doc.setTextColor(0, 0, 0)
    yy = yMeta + 1

    doc.setFontSize(8)
    let lineY = yy + 3
    if (meta.source_file_name) {
      doc.text(`Datei: ${meta.source_file_name}`, MARGIN_MM, lineY)
      lineY += 4
    }
    const aus = formatAuslieferungDe(meta.auslieferung_ab ?? undefined)
    if (aus) {
      doc.text(`Auslieferung ab: ${aus}`, MARGIN_MM, lineY)
      lineY += 4
    }
    yy = lineY + 2
    return yy
  }

  const drawTableHead = (yy: number): number => {
    doc.setFillColor(235, 235, 235)
    doc.rect(MARGIN_MM, yy, tableW, HEADER_ROW_H_MM, 'F')
    doc.setDrawColor(175, 175, 175)
    doc.setLineWidth(0.12)
    doc.rect(MARGIN_MM, yy, tableW, HEADER_ROW_H_MM, 'S')
    for (let i = 1; i < xs.length; i++) {
      doc.line(xs[i], yy, xs[i], yy + HEADER_ROW_H_MM)
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(ROW_HEADER_FONT_PT)
    doc.setTextColor(35, 35, 35)
    const midY = yy + HEADER_ROW_H_MM / 2 + 2

    const labels = [
      'Bild',
      'PLU',
      'Artikel',
      'List\nEK',
      'List\nVK',
      'Akt.\nEK',
      'Akt.\nVK',
      'Mo',
      'Di',
      'Mi',
      'Do',
      'Fr',
      'Sa',
      'Code',
    ]
    for (let c = 0; c < labels.length; c++) {
      const lines = labels[c].split('\n')
      const cx = xs[c] + colWidths[c] / 2
      if (lines.length === 1) {
        doc.text(lines[0], cx, midY, { align: 'center', baseline: 'middle' })
      } else {
        doc.text(lines[0], cx, midY - 2.2, { align: 'center' })
        doc.text(lines[1], cx, midY + 2.5, { align: 'center' })
      }
    }

    /** Nur unter Mo–Sa: kräftigere, „längere“ Trennlinie am Spaltenfuß (volle Spaltenbreite). */
    const headBottomY = yy + HEADER_ROW_H_MM
    doc.setDrawColor(120, 120, 120)
    doc.setLineWidth(0.28)
    for (let d = 0; d < 6; d++) {
      const c = 7 + d
      doc.line(xs[c], headBottomY, xs[c + 1], headBottomY)
    }
    doc.setLineWidth(0.12)
    doc.setDrawColor(175, 175, 175)

    doc.setTextColor(0, 0, 0)
    return yy + HEADER_ROW_H_MM
  }

  let y = drawTitleBlock(false)
  y = drawTableHead(y)

  for (let idx = 0; idx < sorted.length; idx++) {
    const line = sorted[idx]
    const barcodeUrl = barcodeByLineId.get(line.lineId) ?? null
    const rowH = estimateRowHeightMm(doc, line, colWidths)

    if (y + rowH > bottomLimit()) {
      doc.addPage()
      y = drawTitleBlock(true)
      y = drawTableHead(y)
    }

    const rowTop = y
    if (idx % 2 === 1) {
      doc.setFillColor(252, 252, 252)
      doc.rect(MARGIN_MM, rowTop, tableW, rowH, 'F')
    }

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.1)
    doc.rect(MARGIN_MM, rowTop, tableW, rowH, 'S')
    /** Vertikale Linien; zwischen Mo–Sa keine Trennstriche (besser handschriftlich beschreibbar). */
    const moSaInnerLineStart = 8
    const moSaInnerLineEnd = 12
    for (let i = 1; i < xs.length; i++) {
      if (i >= moSaInnerLineStart && i <= moSaInnerLineEnd) continue
      doc.line(xs[i], rowTop, xs[i], rowTop + rowH)
    }

    const imageInfo = imageByLineId.get(line.lineId) ?? null
    const imgColCenter = xs[0] + colWidths[0] / 2
    const imgTop = rowTop + (rowH - THUMB_MM) / 2

    if (imageInfo) {
      try {
        const fmt =
          imageInfo.dataUrl.startsWith('data:image/jpeg') || imageInfo.dataUrl.startsWith('data:image/jpg')
            ? 'JPEG'
            : 'PNG'
        const { drawW, drawH, xOff, yOff } = fitImageInSquareMm(imageInfo.width, imageInfo.height, THUMB_MM)
        doc.addImage(
          imageInfo.dataUrl,
          fmt,
          imgColCenter - THUMB_MM / 2 + xOff,
          imgTop + yOff,
          drawW,
          drawH,
        )
      } catch {
        doc.setFontSize(6)
        doc.setTextColor(150, 150, 150)
        doc.text('–', imgColCenter, rowTop + rowH / 2, { align: 'center', baseline: 'middle' })
        doc.setTextColor(0, 0, 0)
      }
    } else {
      doc.setFontSize(6)
      doc.setTextColor(150, 150, 150)
      doc.text('–', imgColCenter, rowTop + rowH / 2, { align: 'center', baseline: 'middle' })
      doc.setTextColor(0, 0, 0)
    }

    const wArt = colWidths[2] - 2 * CELL_PAD_MM
    const pluCenterX = xs[1] + colWidths[1] / 2
    const artCenterX = xs[2] + colWidths[2] / 2

    doc.setFont('helvetica', 'normal')
    const nameLines = doc.splitTextToSize(line.display_name ?? '', wArt).slice(0, 3)
    const textBlockH = nameLines.length * ROW_LINE_MM
    const artBlockTop = rowTop + (rowH - textBlockH) / 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(ROW_BODY_FONT_PT)
    doc.text(line.plu?.trim() ? getDisplayPlu(line.plu) : '—', pluCenterX, rowTop + rowH / 2, {
      align: 'center',
      baseline: 'middle',
    })

    doc.setFont('helvetica', 'normal')
    for (let nl = 0; nl < nameLines.length; nl++) {
      const lineMidY = artBlockTop + (nl + 0.5) * ROW_LINE_MM
      doc.text(nameLines[nl], artCenterX, lineMidY, {
        align: 'center',
        baseline: 'middle',
      })
    }

    const priceCols = [
      fmtEur(line.list_ek),
      fmtEur(line.list_vk),
      fmtEur(line.purchase_price),
      fmtEur(line.promo_price),
    ]
    for (let p = 0; p < 4; p++) {
      doc.text(priceCols[p], xs[3 + p] + colWidths[3 + p] / 2, rowTop + rowH / 2, {
        align: 'center',
        baseline: 'middle',
      })
    }

    const wd = line.plu ? weekdayByPlu.get(line.plu) : undefined
    const qtyPad = 0.55
    for (let d = 0; d < 6; d++) {
      const wx = xs[7 + d]
      const ww = colWidths[7 + d]
      const bx = wx + qtyPad
      const by = rowTop + qtyPad
      const bw = ww - 2 * qtyPad
      const bh = rowH - 2 * qtyPad
      /** Nur helle Fläche, kein zusätzlicher Rahmen – weniger „Striche“ beim Beschriften. */
      doc.setFillColor(255, 255, 255)
      doc.rect(bx, by, bw, bh, 'F')
      const key = WEEK_KEYS[d]
      const q = wd?.[key]
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(ROW_BODY_FONT_PT)
      if (q == null) {
        /** Kein kurzes „–“ als Platzhalter – lange Linie zum Beschriften (fast volle Zellbreite). */
        const lineY = by + bh * 0.58
        const x1 = bx + QTY_WRITE_LINE_INSET_MM
        const x2 = bx + bw - QTY_WRITE_LINE_INSET_MM
        doc.setDrawColor(145, 145, 145)
        doc.setLineWidth(0.18)
        doc.line(x1, lineY, x2, lineY)
      } else {
        doc.text(fmtQty(q), bx + bw / 2, by + bh / 2, { align: 'center', baseline: 'middle' })
      }
    }
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.1)

    const codeCellInnerW = colWidths[13] - 2 * CELL_PAD_MM
    const codeCellInnerH = rowH - 2 * CELL_PAD_MM
    const bcColCenter = xs[13] + colWidths[13] / 2
    const { w: bw, h: bh } = barcodeFitInCellMm(doc, barcodeUrl, codeCellInnerW, codeCellInnerH)
    if (barcodeUrl && bw > 0) {
      try {
        doc.addImage(barcodeUrl, 'PNG', bcColCenter - bw / 2, rowTop + (rowH - bh) / 2, bw, bh)
      } catch {
        doc.setFontSize(6)
        doc.text('–', bcColCenter, rowTop + rowH / 2, { align: 'center', baseline: 'middle' })
      }
    } else {
      doc.setFontSize(6)
      doc.setTextColor(130, 130, 130)
      doc.text('–', bcColCenter, rowTop + rowH / 2, { align: 'center', baseline: 'middle' })
      doc.setTextColor(0, 0, 0)
    }

    y = rowTop + rowH
  }

  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(130, 130, 130)
    doc.text(`Seite ${p} / ${pageCount}`, PAGE_W_MM - MARGIN_MM, PAGE_H_MM - 4, { align: 'right' })
    doc.setTextColor(0, 0, 0)
  }

  return doc
}
