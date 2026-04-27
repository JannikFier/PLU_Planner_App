// Mini-Vorschau: Auswirkung der Marken-Auswahl auf die Masterliste (nur digital).
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MarkenQuellBadge } from '@/components/marken-auswahl/MarkenQuellBadge'
import { getGroupListStatus } from '@/lib/marken-auswahl-state'
import { backshopSourceLabel } from '@/lib/backshop-sources'
import { cn } from '@/lib/utils'
import type { BackshopSource } from '@/types/database'

type Item = { plu: string; source: BackshopSource; name: string }

function rowState(
  it: Item,
  memberSrc: BackshopSource[],
  chosenEff: BackshopSource[],
  isExclusiveMode: boolean,
): { label: string; dim: boolean; badgeVariant: 'default' | 'secondary' | 'outline' } {
  const st = getGroupListStatus(memberSrc, chosenEff)
  const c = chosenEff.filter((s) => memberSrc.includes(s))
  const inCh = c.includes(it.source)

  if (st === 'offen' || c.length === 0) {
    return { label: 'sichtbar (ohne Wahl)', dim: false, badgeVariant: 'secondary' }
  }
  if (c.length === memberSrc.length) {
    return { label: 'sichtbar', dim: false, badgeVariant: 'secondary' }
  }
  if (isExclusiveMode && c.length === 1) {
    if (c[0] === it.source) {
      return { label: 'exklusiv', dim: false, badgeVariant: 'default' }
    }
    return { label: 'ausgeblendet', dim: true, badgeVariant: 'outline' }
  }
  if (inCh) {
    return { label: 'sichtbar', dim: false, badgeVariant: 'secondary' }
  }
  return { label: 'ausgeblendet', dim: true, badgeVariant: 'outline' }
}

export function MasterlistPreview({
  items,
  memberSrc,
  chosenEff,
  isExclusiveMode,
}: {
  items: Item[]
  memberSrc: BackshopSource[]
  chosenEff: BackshopSource[] | undefined
  isExclusiveMode: boolean
}) {
  const c = (chosenEff ?? []).filter((s) => memberSrc.includes(s))
  const st = getGroupListStatus(memberSrc, chosenEff)
  const showMasterHint = st === 'teil' && c.length > 0 && c.length < memberSrc.length

  return (
    <div className="space-y-2" data-tour="backshop-marken-auswahl-preview">
      <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Auswirkung auf die Masterliste</p>
      <Card className="overflow-hidden p-0 border-stone-200">
        <table className="w-full text-sm">
          <tbody>
            {items.map((it) => {
              const rs = rowState(it, memberSrc, c, isExclusiveMode)
              return (
                <tr
                  key={`${it.plu}-${it.source}`}
                  className={cn('border-b border-stone-200 last:border-b-0', rs.dim && 'opacity-[0.35]')}
                >
                  <td className="px-3 py-2 align-middle">
                    <MarkenQuellBadge source={it.source} size="sm" />
                  </td>
                  <td className="px-1 py-2 font-mono text-xs text-stone-500 tabular-nums align-middle whitespace-nowrap">
                    {it.plu}
                  </td>
                  <td className="px-2 py-2 min-w-0 max-w-[12rem] align-middle">
                    <div className="text-[13.5px] font-medium text-stone-900 truncate">{it.name}</div>
                    <div className="text-[11.5px] text-stone-500 truncate">{backshopSourceLabel(it.source)}</div>
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    <Badge
                      variant={rs.badgeVariant}
                      className={cn(
                        rs.label === 'exklusiv' && 'bg-blue-700 text-white border-0 hover:bg-blue-700/90',
                      )}
                    >
                      {rs.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {showMasterHint && (
          <p className="m-0 border-t border-blue-100 bg-blue-50/90 px-3 py-2 text-xs text-blue-900">
            Hinweis in Masterliste: „Weitere Marken-Varianten verfügbar“
          </p>
        )}
      </Card>
    </div>
  )
}
