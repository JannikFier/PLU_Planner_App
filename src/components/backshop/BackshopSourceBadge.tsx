// Kleines Marken-Badge (E/H/A) für Backshop-Artikel. Nur in der digitalen App, nicht im PDF.

import { BACKSHOP_MANUAL_SOURCE_META, BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import type { BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'

interface BackshopSourceBadgeProps {
  source: BackshopSource | null | undefined
  /** Kompaktmodus (nur Buchstabe) vs. normaler (Buchstabe + Label). Default: compact. */
  variant?: 'compact' | 'full'
  /** Zusätzliche Klassen (z.B. für Abstände in Listen). */
  className?: string
  /** Optionaler Tutorial-Anker (`data-tour`). */
  dataTour?: string
}

export function BackshopSourceBadge({ source, variant = 'compact', className, dataTour }: BackshopSourceBadgeProps) {
  if (!source) return null
  const meta =
    source === 'manual'
      ? BACKSHOP_MANUAL_SOURCE_META
      : BACKSHOP_SOURCE_META[source as BackshopExcelSource]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none border ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${className ?? ''}`}
      title={meta.label}
      aria-label={`Quelle: ${meta.label}`}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
    >
      {variant === 'full' ? `${meta.short} · ${meta.label}` : meta.short}
    </span>
  )
}
