// Zeigt Text mit markierten Suchtreffern (nur die passende Teilzeichenkette)

import { splitTextForHighlight } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

interface HighlightedSearchTextProps {
  text: string
  query: string
  /** Zusätzliche Klassen für <mark> (z. B. in farbiger PLU-Zelle) */
  markClassName?: string
  className?: string
}

/**
 * Rendert Text mit <mark> um alle case-insensitiven Vorkommen von query (getrimmt).
 */
export function HighlightedSearchText({ text, query, markClassName, className }: HighlightedSearchTextProps) {
  const q = query.trim()
  if (!q) return <span className={className}>{text}</span>
  const parts = splitTextForHighlight(text, q)
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className={cn(
              'rounded-sm px-0.5 not-italic bg-amber-200/90 text-foreground',
              markClassName,
            )}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  )
}
