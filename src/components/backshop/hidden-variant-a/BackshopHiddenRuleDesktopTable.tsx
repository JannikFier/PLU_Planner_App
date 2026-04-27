import { Button } from '@/components/ui/button'
import { GitCompareArrows, Undo2 } from 'lucide-react'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { listFindInPageRowClassName, type ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import type { BackshopRuleFilteredRow } from '@/components/plu/BackshopRuleFilteredResponsiveList'
import type { BackshopSource } from '@/types/database'

export function BackshopHiddenRuleDesktopTable({
  rows,
  canEditLineActions,
  forceShowPending,
  onForceShow,
  onRequestBrandPicker,
  findInPage,
  firstItemDataTour,
}: {
  rows: BackshopRuleFilteredRow[]
  canEditLineActions: boolean
  forceShowPending: boolean
  onForceShow: (plu: string, source: BackshopSource) => void
  onRequestBrandPicker?: (row: BackshopRuleFilteredRow) => void
  findInPage?: ListFindInPageBinding
  firstItemDataTour?: string
}) {
  return (
    <div data-testid="backshop-rule-filtered-list" className="bshva-a-table bshva-a-table--rule">
      <div className="bshva-a-head">
        <div />
        <div>PLU</div>
        <div>Artikel</div>
        <div>Marke</div>
        <div>Warengruppe</div>
        <div className="text-right">Aktionen</div>
      </div>
      {rows.length === 0 ? (
        <div className="bshva-empty">Keine Produkte entsprechen den Filterkriterien.</div>
      ) : (
        rows.map((row, rowIndex) => {
          const showMarken =
            canEditLineActions &&
            row.productGroupId &&
            row.productGroupMemberCount > 1 &&
            onRequestBrandPicker
          return (
            <div
              key={row.id}
              className={cn('bshva-a-row', listFindInPageRowClassName(rowIndex, findInPage))}
              data-testid="backshop-rule-row"
              {...(findInPage ? { 'data-row-index': rowIndex } : {})}
              {...(firstItemDataTour && rowIndex === 0 ? { 'data-tour': firstItemDataTour } : {})}
            >
              <div className="bshva-prow-thumb">
                <BackshopThumbnail src={row.thumbUrl} size="2xl" className="h-[72px] w-[72px]" />
              </div>
              <div className="bshva-prow-plu font-mono">{getDisplayPlu(row.plu)}</div>
              <div>
                <div className="bshva-prow-name">{row.name}</div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <BackshopSourceBadge source={row.backshopSource} variant="full" />
                  {showMarken && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 bg-background gap-1 px-2"
                      title="Marken wählen"
                      aria-label="Marken wählen"
                      onClick={() => onRequestBrandPicker!(row)}
                    >
                      <GitCompareArrows className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">Marken wählen</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="bshva-prow-hint text-xs">{row.blockLabel}</div>
              <div className="bshva-prow-actions flex flex-wrap items-center justify-end gap-1.5">
                {canEditLineActions && (
                  <Button
                    type="button"
                    size="sm"
                    className="bshva-btn-primary h-8"
                    disabled={forceShowPending}
                    onClick={() => onForceShow(row.plu, row.backshopSource)}
                  >
                    <Undo2 className="h-3.5 w-3.5 mr-1" />
                    Einblenden
                  </Button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
