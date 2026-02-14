// PLUFooter: Statistik-Zeile unter der PLU-Tabelle

import { Badge } from '@/components/ui/badge'
import type { PLUStats } from '@/lib/plu-helpers'

interface PLUFooterProps {
  /** Berechnete Statistiken */
  stats: PLUStats
}

/**
 * Zeigt Zusammenfassung unter der Tabelle:
 * Gesamt | Neu (gelb) | Geändert (rot) | Eigene | Ausgeblendet
 */
export function PLUFooter({ stats }: PLUFooterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 py-2 text-sm text-muted-foreground">
      <span>
        <strong className="text-foreground">{stats.total}</strong> Artikel gesamt
      </span>

      <span className="text-border">|</span>

      <span className="flex items-center gap-1.5">
        <Badge
          variant="secondary"
          className="bg-plu-new-bg text-plu-new-text border-0 text-xs"
        >
          {stats.newCount}
        </Badge>
        Neu
      </span>

      <span className="text-border">|</span>

      <span className="flex items-center gap-1.5">
        <Badge
          variant="secondary"
          className="bg-plu-changed-bg text-plu-changed-text border-0 text-xs"
        >
          {stats.changedCount}
        </Badge>
        PLU geändert
      </span>

      {stats.customCount > 0 && (
        <>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 text-xs">
              {stats.customCount}
            </Badge>
            Eigene Produkte
          </span>
        </>
      )}

      {stats.hidden > 0 && (
        <>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1.5">
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-0 text-xs">
              {stats.hidden}
            </Badge>
            Ausgeblendet
          </span>
        </>
      )}
    </div>
  )
}
