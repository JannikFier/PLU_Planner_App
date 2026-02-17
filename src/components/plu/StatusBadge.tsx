// StatusBadge: Farbige PLU-Zelle je nach Status

import React from 'react'
import { cn } from '@/lib/utils'
import { getDisplayPlu, getStatusColorClass } from '@/lib/plu-helpers'
import type { PLUStatus } from '@/types/plu'

interface StatusBadgeProps {
  /** Die PLU-Nummer */
  plu: string
  /** Status des PLU-Eintrags */
  status: PLUStatus | string
  /** Optionale alte PLU (wird bei PLU_CHANGED_RED als Tooltip angezeigt) */
  oldPlu?: string | null
  /** Zusätzliche CSS-Klassen */
  className?: string
  /** Inline-Styles (z.B. für dynamische Schriftgrößen) */
  style?: React.CSSProperties
}

/**
 * Zeigt die PLU-Nummer mit farbigem Hintergrund basierend auf dem Status.
 * - Gelb: Neues Produkt
 * - Rot: PLU geändert (zeigt alte PLU als Tooltip)
 * - Kein Hintergrund: Unverändert
 */
export const StatusBadge = React.memo(function StatusBadge({ plu, status, oldPlu, className, style }: StatusBadgeProps) {
  const colorClass = getStatusColorClass(status)
  const hasOldPlu = status === 'PLU_CHANGED_RED' && oldPlu

  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 font-mono text-sm tabular-nums',
        colorClass,
        className,
      )}
      style={style}
      title={hasOldPlu ? `Vorher: ${oldPlu}` : undefined}
    >
      {getDisplayPlu(plu)}
    </span>
  )
})
