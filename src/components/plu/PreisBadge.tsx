// PreisBadge: Preis-Kasten für eigene Produkte – gleiches Styling wie PLU-Zelle (StatusBadge)

import { formatPreisEur } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

interface PreisBadgeProps {
  value: number
  className?: string
  style?: React.CSSProperties
}

/** Zeigt Preis als Kasten wie PLU – gleiche Schrift, gleicher Kasten, nur hinten. */
export function PreisBadge({ value, className, style }: PreisBadgeProps) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-sm tabular-nums bg-muted/60',
        className,
      )}
      style={style}
    >
      {formatPreisEur(value)}
    </span>
  )
}
