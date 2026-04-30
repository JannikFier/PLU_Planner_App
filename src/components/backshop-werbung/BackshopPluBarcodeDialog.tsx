// Großansicht Strichcodes: PLU (Code128) + optional GTIN aus Excel-Spalte „Art. Nr.“

import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { barcodeDigitsOnly, paintBarcodeCanvas } from '@/lib/backshop-barcode'
import { formatKWLabel } from '@/lib/plu-helpers'

export interface BackshopPluBarcodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plu: string
  productName: string
  /** Aus Exit-Excel „Art. Nr.“ (GTIN/EAN), Feld `source_art_nr` */
  sourceArtNr?: string | null
  kw?: number
  jahr?: number
}

export function BackshopPluBarcodeDialog({
  open,
  onOpenChange,
  plu,
  productName,
  sourceArtNr,
  kw,
  jahr,
}: BackshopPluBarcodeDialogProps) {
  const pluCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const gtinCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const pluDigits = useMemo(() => barcodeDigitsOnly(plu), [plu])
  const gtinDigits = useMemo(() => barcodeDigitsOnly(sourceArtNr), [sourceArtNr])

  useLayoutEffect(() => {
    if (!open) return

    const paint = () => {
      if (pluDigits) {
        paintBarcodeCanvas(pluCanvasRef.current, pluDigits)
      }
      if (gtinDigits) {
        paintBarcodeCanvas(gtinCanvasRef.current, gtinDigits)
      }
    }

    paint()
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(paint)
    })
    return () => cancelAnimationFrame(id)
  }, [open, pluDigits, gtinDigits])

  const kwHint =
    kw != null && jahr != null ? formatKWLabel(kw, jahr) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Strichcode</DialogTitle>
          <DialogDescription className="sr-only">
            Strichcodes zur PLU und optional zur Artikelnummer aus der Werbe-Excel
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-stretch gap-5 py-2">
          <div className="text-center space-y-1">
            <p className="font-medium text-foreground">{productName}</p>
            <p className="text-sm text-muted-foreground tabular-nums">PLU {plu}</p>
            {kwHint && (
              <p className="text-xs text-muted-foreground">Werbung {kwHint}</p>
            )}
          </div>

          {/* PLU */}
          <section className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Aus PLU (Code 128)
            </p>
            <p className="text-xs text-muted-foreground">
              Fünfstellige PLU wie im Kassensystem — gleiche Ziffern wie oben, ohne Prüfziffer-EAN.
            </p>
            {!pluDigits ? (
              <p className="text-sm text-destructive">
                Kein Strichcode möglich (PLU enthält keine Ziffern).
              </p>
            ) : (
              <div className="w-full overflow-x-auto flex justify-center rounded-lg border bg-muted/30 p-3 min-h-[120px] items-center">
                <canvas
                  key={`plu-${pluDigits}-${open ? '1' : '0'}`}
                  ref={pluCanvasRef}
                  className="max-w-full h-auto"
                  aria-hidden
                />
              </div>
            )}
          </section>

          {/* GTIN / Art.-Nr. */}
          <section className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-foreground">
              Aus Artikelnummer / GTIN (Excel „Art. Nr.“)
            </p>
            {!gtinDigits ? (
              <p className="text-sm text-muted-foreground">
                Für diese Zeile ist keine Artikelnummer aus der Werbe-Excel gespeichert. Nach einem
                erneuten Upload der KW mit gültiger Spalte „Art. Nr.“ erscheint hier der Strichcode
                (EAN-13/UPC/EAN-8 je nach Länge).
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  {gtinDigits}
                </p>
                <div className="w-full overflow-x-auto flex justify-center rounded-lg border bg-muted/30 p-3 min-h-[120px] items-center">
                  <canvas
                    key={`gtin-${gtinDigits}-${open ? '1' : '0'}`}
                    ref={gtinCanvasRef}
                    className="max-w-full h-auto"
                    aria-hidden
                  />
                </div>
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
