// Einzelkachel: Kasten-Layout — Bild, PLU, Name, Strichcode (GTIN / PLU) mit klarer Beschriftung

import { useLayoutEffect, useMemo, useRef } from 'react'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import {
  barcodeDigitsForBackshopTile,
  backshopTileBarcodeUsesGtin,
  paintBarcodeCanvas,
} from '@/lib/backshop-barcode'
import { cn } from '@/lib/utils'
import type { DisplayItem } from '@/types/plu'

export interface BackshopKachelTileProps {
  item: DisplayItem
  sourceArtNr: string | null | undefined
  className?: string
  /** `compact` = Raster; `expanded` = Großansicht (Dialog), schärferer Strichcode */
  layout?: 'compact' | 'expanded'
}

export function BackshopKachelTile({
  item,
  sourceArtNr,
  className,
  layout = 'compact',
}: BackshopKachelTileProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const usesGtin = useMemo(() => backshopTileBarcodeUsesGtin(sourceArtNr), [sourceArtNr])
  const digits = useMemo(() => barcodeDigitsForBackshopTile(item.plu, sourceArtNr), [item.plu, sourceArtNr])
  const isExpanded = layout === 'expanded'
  const barcodeVariant = isExpanded ? 'kachelDialog' : 'kachel'

  useLayoutEffect(() => {
    if (!digits) return
    const paint = () => {
      paintBarcodeCanvas(canvasRef.current, digits, barcodeVariant)
    }
    paint()
    if (!isExpanded) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(paint)
    })
    return () => cancelAnimationFrame(id)
  }, [digits, barcodeVariant, isExpanded])

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-none border-2 border-slate-800 bg-white text-slate-900 shadow-sm',
        isExpanded && 'rounded-lg',
        className,
      )}
    >
      {/* Produktbild */}
      <div
        className={cn(
          'flex justify-center border-b-2 border-slate-800 bg-slate-100 px-2',
          isExpanded ? 'py-5 sm:py-6' : 'py-3',
        )}
      >
        <BackshopThumbnail
          src={item.image_url}
          size="2xl"
          className={
            isExpanded
              ? 'h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44'
              : 'h-24 w-24 sm:h-[7.25rem] sm:w-[7.25rem]'
          }
        />
      </div>

      {/* PLU + Artikelname */}
      <div
        className={cn(
          'flex flex-col gap-0.5 border-b-2 border-slate-800 text-left',
          isExpanded ? 'px-4 py-4 sm:px-5 sm:py-5' : 'px-3 py-2.5',
        )}
      >
        <span
          className={cn(
            'font-bold uppercase tracking-wider text-slate-500',
            isExpanded ? 'text-xs sm:text-sm' : 'text-[10px]',
          )}
        >
          PLU
        </span>
        <p
          className={cn(
            'font-bold tabular-nums leading-none tracking-tight text-slate-950',
            isExpanded ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl',
          )}
        >
          {item.plu}
        </p>
        <span
          className={cn(
            'font-bold uppercase tracking-wider text-slate-500',
            isExpanded ? 'mt-2 text-xs sm:text-sm' : 'mt-2 text-[10px]',
          )}
        >
          Artikel
        </span>
        <p
          className={cn(
            'font-semibold leading-snug text-slate-900 break-words',
            isExpanded ? 'text-base sm:text-lg md:text-xl' : 'line-clamp-4 min-h-[2.75rem] text-sm',
          )}
        >
          {item.display_name}
        </p>
      </div>

      {/* Strichcode (Ziffern wie in der Liste: GTIN oder PLU als Code128) */}
      <div
        className={cn(
          'flex flex-col bg-slate-100',
          isExpanded ? 'gap-2 px-4 py-4 sm:gap-2.5 sm:px-5 sm:py-5' : 'gap-1.5 px-3 py-2.5',
        )}
      >
        <span
          className={cn(
            'font-bold uppercase tracking-wider text-slate-600',
            isExpanded ? 'text-xs sm:text-sm' : 'text-[10px]',
          )}
        >
          {usesGtin ? 'GTIN' : 'Strichcode'}
        </span>
        {digits ? (
          <>
            <div
              className={cn(
                'flex justify-center border border-slate-800 bg-white',
                isExpanded ? 'px-2 py-3 sm:px-3 sm:py-4' : 'px-1 py-1.5',
              )}
            >
              <canvas
                ref={canvasRef}
                className={cn(
                  isExpanded
                    ? 'max-h-36 w-auto max-w-full object-contain object-center'
                    : 'h-[4.5rem] w-full max-w-[220px]',
                )}
                aria-hidden
              />
            </div>
            {isExpanded && digits ? (
              <p className="text-center font-mono text-sm font-semibold tabular-nums tracking-wide text-slate-900 sm:text-base">
                {digits}
              </p>
            ) : null}
            {usesGtin ? (
              <p
                className={cn(
                  'text-center font-medium tabular-nums text-slate-700',
                  isExpanded ? 'text-sm sm:text-base' : 'text-[11px]',
                )}
              >
                PLU <span className="font-semibold text-slate-900">{item.plu}</span>
              </p>
            ) : null}
          </>
        ) : (
          <span className="text-center text-xs text-muted-foreground">Kein Strichcode</span>
        )}
      </div>
    </div>
  )
}
