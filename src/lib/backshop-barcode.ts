// JsBarcode-Helfer für Werbung bestellen (PLU + GTIN/Art.-Nr.)

import JsBarcode from 'jsbarcode'

const BASE_OPTS = {
  displayValue: true,
  fontSize: 14,
  height: 88,
  margin: 10,
} as const

/** Nur Ziffern (führende Nullen bei GTIN bleiben im String erhalten). */
export function barcodeDigitsOnly(raw: string | null | undefined): string {
  if (raw == null) return ''
  return String(raw).replace(/\D/g, '')
}

/**
 * Zeichnet einen Strichcode auf dem Canvas.
 * GTIN: 13→EAN-13, 12→UPC, 8→EAN-8; sonst Code128. Bei ungültiger Prüfziffer → Fallback Code128.
 */
export function paintBarcodeCanvas(canvas: HTMLCanvasElement | null, digits: string): boolean {
  if (!canvas || !digits) return false

  const attempts: Array<{ format: string; width: number }> = []
  const len = digits.length
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
    attempts.push({ format: 'CODE128', width: len > 48 ? 1.2 : 2 })
  }

  for (const { format, width } of attempts) {
    try {
      JsBarcode(canvas, digits, {
        ...BASE_OPTS,
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
