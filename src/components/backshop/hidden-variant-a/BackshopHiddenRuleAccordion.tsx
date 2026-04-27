import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackshopHiddenRuleDesktopTable } from './BackshopHiddenRuleDesktopTable'
import type { BackshopRuleFilteredRow } from '@/components/plu/BackshopRuleFilteredResponsiveList'
import type { BackshopSource } from '@/types/database'

export type RuleBlockGroup = { blockId: string; label: string; rows: BackshopRuleFilteredRow[] }

export function BackshopHiddenRuleAccordion({
  groups,
  expandedBlockIds,
  onToggleBlock,
  onOpenBlockDetail,
  canEditLineActions,
  forceShowPending,
  onForceShow,
  onRequestBrandPicker,
  canNavigateGruppenregeln,
  onOpenGruppenregeln,
}: {
  groups: RuleBlockGroup[]
  expandedBlockIds: Set<string>
  onToggleBlock: (blockId: string) => void
  onOpenBlockDetail: (blockId: string) => void
  canEditLineActions: boolean
  forceShowPending: boolean
  onForceShow: (plu: string, source: BackshopSource) => void
  onRequestBrandPicker?: (row: BackshopRuleFilteredRow) => void
  canNavigateGruppenregeln: boolean
  onOpenGruppenregeln: () => void
}) {
  if (groups.length === 0) {
    return <div className="bshva-empty">Keine Treffer (Filter oder Suche).</div>
  }

  return (
    <div className="bshva-panel-body-flush">
      {groups.map((g) => {
        const expanded = expandedBlockIds.has(g.blockId)
        return (
          <div key={g.blockId} className="bshva-rule-group">
            <button
              type="button"
              className="bshva-rule-group-head"
              aria-expanded={expanded}
              onClick={() => onToggleBlock(g.blockId)}
            >
              <span className="bshva-rule-group-chev shrink-0">
                <ChevronRight className="h-4 w-4" />
              </span>
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ background: 'var(--bshva-rule-600)' }}
                aria-hidden
              >
                G
              </span>
              <span className="bshva-rule-group-title">{g.label}</span>
              <span className="bshva-rule-group-count shrink-0">Warengruppe · {g.rows.length} Produkte</span>
              {canNavigateGruppenregeln && (
                <span
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenGruppenregeln()
                  }}
                >
                  <Button type="button" variant="outline" size="sm" className="h-8 bg-background">
                    Gruppenregeln
                  </Button>
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 shrink-0 ml-auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenBlockDetail(g.blockId)
                }}
              >
                Vollansicht
              </Button>
            </button>
            {expanded && (
              <BackshopHiddenRuleDesktopTable
                rows={g.rows}
                canEditLineActions={canEditLineActions}
                forceShowPending={forceShowPending}
                onForceShow={onForceShow}
                onRequestBrandPicker={onRequestBrandPicker}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
