import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Undo2 } from 'lucide-react'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { listFindInPageRowClassName, type ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import { cn } from '@/lib/utils'
import type { HiddenProductDisplayRow } from '@/components/plu/HiddenProductsResponsiveList'
import { manualRowPrimarySource } from './backshop-hidden-brand-helpers'

export function BackshopHiddenManualDesktopTable({
  rows,
  canManageHidden,
  unhidePending,
  onUnhide,
  findInPage,
  firstItemDataTour,
  firstShowButtonDataTour,
}: {
  rows: HiddenProductDisplayRow[]
  canManageHidden: boolean
  unhidePending: boolean
  onUnhide: (plu: string) => void
  findInPage?: ListFindInPageBinding
  firstItemDataTour?: string
  firstShowButtonDataTour?: string
}) {
  return (
    <div data-testid="backshop-hidden-manual-desktop">
      <div className="bshva-a-head">
        <div />
        <div>PLU</div>
        <div>Artikel</div>
        <div>Marke</div>
        <div>Warengruppe</div>
        <div>Ausgeblendet von</div>
        <div className="text-right">Aktionen</div>
      </div>
      {rows.length === 0 ? (
        <div className="bshva-empty">Keine Produkte entsprechen den Filterkriterien.</div>
      ) : (
        rows.map((row, rowIndex) => (
          <div
            key={row.plu}
            className={cn('bshva-a-row', listFindInPageRowClassName(rowIndex, findInPage))}
            {...(findInPage ? { 'data-row-index': rowIndex } : {})}
            {...(firstItemDataTour && rowIndex === 0 ? { 'data-tour': firstItemDataTour } : {})}
          >
            <div className="bshva-prow-thumb">
              <BackshopThumbnail src={row.thumbUrl} size="2xl" className="h-[72px] w-[72px]" />
            </div>
            <div className="bshva-prow-plu font-mono">{getDisplayPlu(row.plu)}</div>
            <div>
              <div className="bshva-prow-name">{row.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {row.source === 'custom' && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    Eigen
                  </Badge>
                )}
                {row.source === 'unknown' && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    Unbekannt
                  </Badge>
                )}
                {row.showCentralCampaignBadge && (
                  <Badge variant="outline" className="text-[10px] h-5 border-[var(--bshva-blue-500)]/40">
                    Werbung
                  </Badge>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <BackshopSourceBadge source={manualRowPrimarySource(row.source, row.backshopSources)} variant="full" />
            </div>
            <div className="bshva-prow-hint text-xs">{row.blockLabel ?? '—'}</div>
            <div className="bshva-prow-hint">
              <div className="flex flex-wrap items-center gap-2 font-medium text-[var(--bshva-n-700)]">
                <span>{row.hiddenByName}</span>
                {row.showVonMirBadge && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Von mir
                  </Badge>
                )}
              </div>
            </div>
            <div className="bshva-prow-actions flex flex-wrap items-center justify-end gap-1.5">
              {row.onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 bg-background"
                  onClick={row.onEdit}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Bearbeiten
                </Button>
              )}
              {canManageHidden && (
                <Button
                  type="button"
                  size="sm"
                  className="bshva-btn-primary h-8"
                  disabled={unhidePending}
                  onClick={() => onUnhide(row.plu)}
                  {...(firstShowButtonDataTour && rowIndex === 0
                    ? { 'data-tour': firstShowButtonDataTour }
                    : {})}
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                  Einblenden
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
