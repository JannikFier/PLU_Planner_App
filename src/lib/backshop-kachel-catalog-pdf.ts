// PDF: Backshop-Kachel-Katalog (Warengruppen, Bild, PLU, Name, Strichcode, Erstellungsdatum)

import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { DisplayItem } from '@/types/plu'
import type { BackshopKachelWarengruppeBlock } from '@/lib/backshop-kachel-groups'
import {
  backshopTileBarcodeUsesGtin,
  barcodeDigitsForBackshopTile,
  barcodeToPngWithMetrics,
} from '@/lib/backshop-barcode'
import { loadRemoteImageForPdf } from '@/lib/pdf-remote-image'
import { getDisplayNameForItem } from '@/lib/plu-helpers'

async function loadJsPDFConstructor(): Promise<(typeof import('jspdf'))['default']> {
  const { default: Ctor } = await import('jspdf')
  return Ctor
}

export interface BackshopKachelCatalogPdfInput {
  storeName: string
  standLabel: string
  kwHint: string | null
  blocks: BackshopKachelWarengruppeBlock[]
  sourceArtNrByPlu: Map<string, string>
}

const PAGE = { w: 210, h: 297, margin: 12 }
const COLS = 3
const GAP = 3.5
const BLOCK_HEADER_H = 9.5
const ROW_GAP = 2.5

/**
 * Vertikales Raster einer Kachel (mm) — fester Fluss von oben nach unten, keine Boden-Verankerung des Strichcodes.
 */
const CELL = {
  imgBand: 20,
  /** Luft zwischen Bildband und PLU */
  gapAfterImg: 3.8,
  /** Höhe der PLU-Zeile (Baseline-Bereich) */
  pluZoneH: 4.6,
  /** Zwei Namenszeilen, gleichmäßiges Raster */
  nameZoneH: 6.5,
  nameMaxLines: 2,
  gapBeforeBarcode: 2.2,
  barcodeBoxH: 14.8,
  /** Platz für „PLU …" unter dem Strichcode-Kasten bei GTIN */
  gtinFooterH: 2.9,
  bottomPad: 1.2,
} as const

const cellH =
  CELL.imgBand +
  CELL.gapAfterImg +
  CELL.pluZoneH +
  CELL.nameZoneH +
  CELL.gapBeforeBarcode +
  CELL.barcodeBoxH +
  CELL.gtinFooterH +
  CELL.bottomPad

function sanitizeFilePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'markt'
}

export function buildBackshopKachelCatalogPdfFileName(storeName: string | null | undefined): string {
  const part = sanitizeFilePart(storeName ?? 'markt')
  const ts = format(new Date(), 'yyyy-MM-dd_HHmm', { locale: de })
  return `backshop-kacheln-${part}-${ts}.pdf`
}

function displayNameForPdf(item: DisplayItem): string {
  return getDisplayNameForItem(item.display_name, item.system_name, item.is_custom)
}

/** Skaliert Barcode-PNG proportional in eine mm-Box, zentriert. */
function barcodeDrawSizeMm(
  widthPx: number,
  heightPx: number,
  maxWmm: number,
  maxHmm: number,
): { drawW: number; drawH: number } {
  if (widthPx <= 0 || heightPx <= 0) return { drawW: 0, drawH: 0 }
  const scale = Math.min(maxWmm / widthPx, maxHmm / heightPx)
  return { drawW: widthPx * scale, drawH: heightPx * scale }
}

/**
 * Erzeugt ein mehrseitiges A4-PDF mit Kacheln pro Warengruppe (ohne Werbung).
 */
export async function generateBackshopKachelCatalogPdf(input: BackshopKachelCatalogPdfInput): Promise<Blob> {
  const JSPDF = await loadJsPDFConstructor()
  const doc = new JSPDF({ unit: 'mm', format: 'a4' })
  const usableW = PAGE.w - 2 * PAGE.margin
  const colW = (usableW - (COLS - 1) * GAP) / COLS

  let y = PAGE.margin

  const newPage = () => {
    doc.addPage()
    y = PAGE.margin
  }

  const ensureY = (need: number) => {
    if (y + need > PAGE.h - PAGE.margin) newPage()
  }

  const drawHeader = () => {
    ensureY(28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(28, 28, 32)
    doc.text('Backshop-Liste', PAGE.margin, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(70, 70, 78)
    doc.text(`Erstellt: ${input.standLabel}`, PAGE.margin, y)
    y += 5
    doc.text(`Markt: ${input.storeName}`, PAGE.margin, y)
    y += 5
    if (input.kwHint) {
      doc.text(`Listen-Kontext: ${input.kwHint}`, PAGE.margin, y)
      y += 5
    }
    doc.setTextColor(0, 0, 0)
    y += 4
  }

  drawHeader()

  for (const block of input.blocks) {
    if (block.items.length === 0) continue

    // Kein „Waisen“-Blockkopf ohne mindestens eine Kachelzeile
    ensureY(BLOCK_HEADER_H + cellH + ROW_GAP)

    doc.setFillColor(236, 237, 241)
    doc.rect(PAGE.margin, y, usableW, 7.5, 'F')
    doc.setDrawColor(200, 202, 210)
    doc.setLineWidth(0.2)
    doc.rect(PAGE.margin, y, usableW, 7.5, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(32, 34, 40)
    doc.text(block.label, PAGE.margin + 2.2, y + 5.2)
    y += BLOCK_HEADER_H

    const items = block.items
    const nRows = Math.ceil(items.length / COLS)

    for (let r = 0; r < nRows; r++) {
      ensureY(cellH + ROW_GAP)
      const rowTop = y

      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        if (i >= items.length) break

        const x = PAGE.margin + c * (colW + GAP)
        const item = items[i]

        doc.setDrawColor(42, 44, 50)
        doc.setLineWidth(0.4)
        doc.rect(x, rowTop, colW, cellH, 'S')

        // Zone A: Bildband
        doc.setFillColor(248, 249, 251)
        doc.setDrawColor(210, 213, 220)
        doc.setLineWidth(0.15)
        doc.rect(x, rowTop, colW, CELL.imgBand, 'FD')

        const imgPad = 1.4
        const imgSize = CELL.imgBand - imgPad * 2
        if (item.image_url) {
          const loaded = await loadRemoteImageForPdf(item.image_url)
          if (loaded) {
            try {
              doc.addImage(
                loaded.dataUrl,
                'PNG',
                x + (colW - imgSize) / 2,
                rowTop + imgPad,
                imgSize,
                imgSize,
              )
            } catch {
              /* Bild eingebettet ungültig */
            }
          }
        }

        // Zone B–D: Abstand, PLU, Name (alles zentriert)
        const textBlockTop = rowTop + CELL.imgBand + CELL.gapAfterImg
        const cx = x + colW / 2
        const textMaxW = colW - 4

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(22, 22, 26)
        const pluBaseline = textBlockTop + 3.6
        doc.text(item.plu, cx, pluBaseline, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(52, 54, 60)
        const name = displayNameForPdf(item)
        const nameLines = (doc.splitTextToSize(name, textMaxW) as string[]).slice(0, CELL.nameMaxLines)
        const nameFirstBaseline = textBlockTop + CELL.pluZoneH + 2.4
        doc.text(nameLines, cx, nameFirstBaseline, { align: 'center', lineHeightFactor: 1.15 })

        // Zone E–F: Strichcode-Kasten (PNG proportional, zentriert)
        const barcodeTop =
          rowTop +
          CELL.imgBand +
          CELL.gapAfterImg +
          CELL.pluZoneH +
          CELL.nameZoneH +
          CELL.gapBeforeBarcode

        const srcArt = input.sourceArtNrByPlu.get(item.plu)
        const digits = barcodeDigitsForBackshopTile(item.plu, srcArt)
        const usesGtin = backshopTileBarcodeUsesGtin(srcArt)

        if (digits) {
          const metrics = barcodeToPngWithMetrics(digits, 'kachelPdf')
          doc.setDrawColor(198, 200, 208)
          doc.setLineWidth(0.25)
          doc.rect(x + 1.5, barcodeTop, colW - 3, CELL.barcodeBoxH, 'S')
          doc.setFillColor(255, 255, 255)
          doc.rect(x + 1.6, barcodeTop + 0.1, colW - 3.2, CELL.barcodeBoxH - 0.2, 'F')

          if (metrics) {
            const innerPad = 1.1
            const maxW = colW - 3 - 2 * innerPad
            const maxH = CELL.barcodeBoxH - 2 * innerPad
            const { drawW, drawH } = barcodeDrawSizeMm(metrics.widthPx, metrics.heightPx, maxW, maxH)
            if (drawW > 0 && drawH > 0) {
              const drawX = x + (colW - drawW) / 2
              const drawY = barcodeTop + (CELL.barcodeBoxH - drawH) / 2
              try {
                doc.addImage(metrics.dataUrl, 'PNG', drawX, drawY, drawW, drawH)
              } catch {
                /* Barcode-PNG */
              }
            }
          }

          if (usesGtin) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6)
            doc.setTextColor(88, 90, 98)
            doc.text(`PLU ${item.plu}`, cx, barcodeTop + CELL.barcodeBoxH + 2.1, { align: 'center' })
          }
        }

        doc.setTextColor(0, 0, 0)
      }

      y = rowTop + cellH + ROW_GAP
    }

    y += 3.5
  }

  return doc.output('blob')
}
