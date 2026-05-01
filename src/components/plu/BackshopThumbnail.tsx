// Quadratische Backshop-Bildvorschau: volles Bild sichtbar (object-contain), konsistent mit PLU-Tabelle

import { useState } from 'react'
import { cn } from '@/lib/utils'

export type BackshopThumbnailSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'hero'

const SIZE_CLASS: Record<BackshopThumbnailSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-20 w-20',
  /** Listen (Desktop): große Vorschau neben PLU/Name */
  '2xl': 'h-24 w-24',
  /** Warengruppen-Karten (kompakt) */
  '3xl': 'h-16 w-16 sm:h-[72px] sm:w-[72px]',
  /** Warengruppen-Workbench: volle Kartenbreite (3er-Raster: etwas niedriger) */
  hero: 'h-28 w-full min-h-[112px] self-stretch max-w-none rounded-lg sm:h-32 sm:min-h-[128px]',
}

export interface BackshopThumbnailProps {
  src: string | null | undefined
  /** Standard: md (40×40), wie Listen „Umbenannt / Ausgeblendet“ */
  size?: BackshopThumbnailSize
  className?: string
}

/**
 * Quadratischer Rahmen; Bild wird vollständig angezeigt, nicht beschnitten (object-contain).
 */
export function BackshopThumbnail({ src, size = 'md', className }: BackshopThumbnailProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const showImg = Boolean(src) && !loadFailed

  return (
    <div
      className={cn(
        'shrink-0 rounded-md flex items-center justify-center overflow-hidden',
        SIZE_CLASS[size],
        showImg ? 'border border-border bg-muted' : 'border border-dashed border-border bg-muted/50',
        className,
      )}
      aria-hidden={!showImg}
    >
      {showImg ? (
        <img
          src={src!}
          alt=""
          className="h-full w-full object-contain p-0.5 [image-rendering:crisp-edges]"
          loading="lazy"
          decoding="async"
          onError={() => setLoadFailed(true)}
        />
      ) : null}
    </div>
  )
}
