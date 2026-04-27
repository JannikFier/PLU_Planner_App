import type { BackshopSource } from '@/types/database'
import type { BackshopExcelSource } from '@/lib/backshop-sources'

export type BackshopHiddenSourceSegment = 'all' | BackshopExcelSource | 'eigen'

export function matchBackshopHiddenSourceSegment(
  segment: BackshopHiddenSourceSegment,
  ctx: {
    listKind: 'manual' | 'rule'
    /** manuell: master | custom | unknown; Regel: immer 'master' */
    rowSource: 'master' | 'custom' | 'unknown'
    /** Master-Quellzeilen (kann mehrere Marken pro PLU sein) */
    backshopSources?: BackshopSource[]
    /** Regel-Liste: eine Quelle pro Zeile */
    ruleLineSource?: BackshopSource
  },
): boolean {
  if (segment === 'all') return true
  if (segment === 'eigen') {
    return ctx.rowSource === 'custom'
  }
  if (ctx.rowSource === 'custom' || ctx.rowSource === 'unknown') return false
  if (ctx.listKind === 'rule' && ctx.ruleLineSource) {
    return ctx.ruleLineSource === segment
  }
  const srcs = ctx.backshopSources ?? ['edeka' as BackshopSource]
  return srcs.includes(segment)
}
