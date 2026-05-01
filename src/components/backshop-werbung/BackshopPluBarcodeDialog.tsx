// Großansicht Strichcode zur GTIN/Art.-Nr. aus der Werbe-Excel („Art. Nr.“); PLU nur als Kontext-Text

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
  const gtinCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const gtinDigits = useMemo(() => barcodeDigitsOnly(sourceArtNr), [sourceArtNr])

  useLayoutEffect(() => {
    if (!open || !gtinDigits) return

    const paint = () => {
      paintBarcodeCanvas(gtinCanvasRef.current, gtinDigits)
    }

    paint()
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(paint)
    })
    return () => cancelAnimationFrame(id)
  }, [open, gtinDigits])

  const kwHint =
    kw != null && jahr != null ? formatKWLabel(kw, jahr) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Strichcode</DialogTitle>
          <DialogDescription className="sr-only">
            Strichcode zur Artikelnummer bzw. GTIN aus der Spalte „Art. Nr.“ der Werbe-Excel
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

          {/* GTIN / Art.-Nr. — primärer Strichcode */}
          <section className="space-y-2">
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
