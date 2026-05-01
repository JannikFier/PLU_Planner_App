import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Backshop: Bildspalte – auf schmalen Screens kleiner, damit PLU/Artikel/Preis nicht überlappen */
export const BACKSHOP_IMAGE_COL = 'w-[72px] sm:w-[96px] md:w-[128px]'
const BACKSHOP_IMAGE_SIZE = 'h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24'
/** object-contain = nichts abschneiden; crisp-edges = schärfere Skalierung */
const BACKSHOP_IMAGE_CLASS = 'object-contain rounded border border-border [image-rendering:crisp-edges]'

/** Mobile Backshop-Kartenliste (lg:hidden wenn breite Tabelle erst ab lg): größeres Bild ab sm/md */
const BACKSHOP_IMAGE_SIZE_LIST = 'h-24 w-24'

type PluTableBackshopThumbnailProps = {
  src: string | null | undefined
  /** Standard = Tabellen-Zelle; list = kompakte Mobile-Karte */
  size?: 'default' | 'list'
}

/**
 * Backshop-Vorschaubild in der PLU-Tabelle bzw. Mobile-Kartenliste.
 * Lazy-Load reduziert parallele Decoder-Last bei langen Listen.
 */
export function PluTableBackshopThumbnail({ src, size = 'default' }: PluTableBackshopThumbnailProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const showPlaceholder = !src || loadFailed
  const box = size === 'list' ? BACKSHOP_IMAGE_SIZE_LIST : BACKSHOP_IMAGE_SIZE
  if (showPlaceholder) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded border border-border bg-muted/50 text-muted-foreground text-xs',
          box,
        )}
        data-tour="backshop-master-thumbnail"
      >
        –
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={cn(box, BACKSHOP_IMAGE_CLASS)}
      data-tour="backshop-master-thumbnail"
      loading="lazy"
      decoding="async"
      onError={() => setLoadFailed(true)}
    />
  )
}
