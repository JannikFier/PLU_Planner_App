// JsBarcode-Helfer für Werbung bestellen (PLU + GTIN/Art.-Nr.)

import JsBarcode from 'jsbarcode'

const BASE_OPTS = {
  displayValue: true,
  fontSize: 14,
  height: 88,
  margin: 10,
} as const

const KACHEL_CANVAS_OPTS = {
  displayValue: true,
  fontSize: 11,
  height: 52,
  margin: 2,
} as const

/** Kachel-PDF: nur Balken (keine Ziffern im PNG — stehen im Textblock); etwas höhere Balken für Skalierung. */
const KACHEL_PDF_OPTS = {
  displayValue: false,
  fontSize: 10,
  height: 58,
  margin: 4,
} as const

/** Kachel-Großansicht-Dialog: nur Balken; Ziffern separat als HTML (kein Bitmap-Stretch). */
const KACHEL_DIALOG_OPTS = {
  displayValue: false,
  fontSize: 12,
  height: 72,
  margin: 6,
} as const

export type BackshopBarcodeCanvasVariant = 'default' | 'kachel' | 'kachelPdf' | 'kachelDialog'

/** Nur Ziffern (führende Nullen bei GTIN bleiben im String erhalten). */
export function barcodeDigitsOnly(raw: string | null | undefined): string {
  if (raw == null) return ''
  return String(raw).replace(/\D/g, '')
}

/** True, wenn der Kachel-Strichcode aus Art.-Nr./GTIN (nicht PLU-Fallback) kommt. */
export function backshopTileBarcodeUsesGtin(sourceArtNr: string | null | undefined): boolean {
  return barcodeDigitsOnly(sourceArtNr).length > 0
}

/** Kachel/PDF: GTIN wenn vorhanden, sonst Ziffern aus PLU (Code128-Fallback). */
export function barcodeDigitsForBackshopTile(plu: string, sourceArtNr: string | null | undefined): string {
  const g = barcodeDigitsOnly(sourceArtNr)
  if (g.length > 0) return g
  const p = barcodeDigitsOnly(plu)
  return p.length > 0 ? p : plu
}

/**
 * Zeichnet einen Strichcode auf dem Canvas.
 * GTIN: 13→EAN-13, 12→UPC, 8→EAN-8; sonst Code128. Bei ungültiger Prüfziffer → Fallback Code128.
 * @param canvasVariant `kachel` = UI-Kacheln; `kachelPdf` = nur Balken (PDF); `kachelDialog` = nur Balken (Großansicht)
 */
export function paintBarcodeCanvas(
  canvas: HTMLCanvasElement | null,
  digits: string,
  canvasVariant: BackshopBarcodeCanvasVariant = 'default',
): boolean {
  if (!canvas || !digits) return false

  const baseOpts =
    canvasVariant === 'kachelPdf'
      ? { ...BASE_OPTS, ...KACHEL_PDF_OPTS }
      : canvasVariant === 'kachelDialog'
        ? { ...BASE_OPTS, ...KACHEL_DIALOG_OPTS }
        : canvasVariant === 'kachel'
          ? { ...BASE_OPTS, ...KACHEL_CANVAS_OPTS }
          : BASE_OPTS

  const len = digits.length
  const code128WidthBarsOnly = (): number => {
    if (canvasVariant !== 'kachelPdf' && canvasVariant !== 'kachelDialog') return len > 48 ? 1.2 : 2
    if (len > 16) return 1.35
    if (len > 10) return 1.65
    return 2
  }

  const attempts: Array<{ format: string; width: number }> = []
  if (len === 13) {
    attempts.push({ format: 'EAN13', width: 1.15 })
    attempts.push({ format: 'CODE128', width: 2 })
  } else if (len === 12) {
    attempts.push({ format: 'UPC', width: 1.15 })
    attempts.push({ format: 'CODE128', width: 2 })
  } else if (len === 8) {
    attempts.push({ format: 'EAN8', width: 1.15 })
    attempts.push({ format: 'CODE128', width: 2 })
  } else {
    attempts.push({ format: 'CODE128', width: code128WidthBarsOnly() })
  }

  for (const { format, width } of attempts) {
    try {
      JsBarcode(canvas, digits, {
        ...baseOpts,
        format: format as never,
        width,
      })
      return true
    } catch {
      /* nächster Versuch */
    }
  }
  return false
}

/** PNG plus Pixelmaße — für PDF-Einbettung mit Seitenverhältnis (mm-Skalierung im Aufrufer). */
export interface BarcodePngMetrics {
  dataUrl: string
  widthPx: number
  heightPx: number
}

/**
 * Rendert denselben Strichcode wie in der UI als PNG-Data-URL (z. B. für jsPDF).
 * `kachel`: UI-Kacheln; `kachelPdf`: nur Balken (PDF); `kachelDialog`: nur Balken (Großansicht).
 * Nur im Browser (DOM Canvas).
 */
export function barcodeToPngDataUrl(
  digits: string,
  variant: BackshopBarcodeCanvasVariant = 'default',
): string | null {
  const m = barcodeToPngWithMetrics(digits, variant)
  return m?.dataUrl ?? null
}

/**
 * Wie `barcodeToPngDataUrl`, liefert zusätzlich Canvas-Breite/-Höhe für proportionales Skalieren.
 */
export function barcodeToPngWithMetrics(
  digits: string,
  variant: BackshopBarcodeCanvasVariant,
): BarcodePngMetrics | null {
  if (!digits || typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  if (!paintBarcodeCanvas(canvas, digits, variant)) return null
  try {
    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthPx: canvas.width,
      heightPx: canvas.height,
    }
  } catch {
    return null
  }
}
