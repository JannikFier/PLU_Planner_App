// Filter-Chips für Backshop-Quellen (Edeka, Harry, Aryzta).
// Mehrfachauswahl: Klick toggelt die einzelne Quelle.
// Leere Auswahl = alle Quellen anzeigen.

import { BACKSHOP_SOURCES, BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'

interface BackshopSourceFilterChipsProps {
  /** Aktuell ausgewählte Quellen (leer = alle). */
  value: BackshopSource[]
  onChange: (next: BackshopSource[]) => void
  /** Zusätzliche Klassen für das umschließende Flex-Div. */
  className?: string
  /** Zählt Artikel pro Quelle (zeigt Zahlen in den Chips). */
  counts?: Partial<Record<BackshopSource, number>>
}

export function BackshopSourceFilterChips({ value, onChange, className, counts }: BackshopSourceFilterChipsProps) {
  const toggle = (s: BackshopSource) => {
    if (value.includes(s)) {
      onChange(value.filter((v) => v !== s))
    } else {
      onChange([...value, s])
    }
  }

  const isAll = value.length === 0

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onChange([])}
        className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
          isAll ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
        }`}
      >
        Alle
      </button>
      {BACKSHOP_SOURCES.map((s) => {
        const meta = BACKSHOP_SOURCE_META[s]
        const active = value.includes(s)
        const count = counts?.[s]
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            title={meta.label}
            className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              active ? `${meta.bgClass} ${meta.textClass} ${meta.borderClass}` : 'bg-background hover:bg-muted'
            }`}
          >
            <span className="font-bold mr-1">{meta.short}</span>
            {meta.label}
            {typeof count === 'number' && (
              <span className="ml-1 opacity-70">({count})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
