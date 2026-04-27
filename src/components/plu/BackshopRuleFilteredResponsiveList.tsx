// Tabelle + mobile Liste: Backshop-Artikel, die nur wegen Gruppen-/Marken-Regeln nicht in der Hauptliste erscheinen

import { Button } from '@/components/ui/button'
import { BackshopSourceBadge } from '@/components/backshop/BackshopSourceBadge'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { listFindInPageRowClassName, type ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import { GitCompareArrows, Undo2 } from 'lucide-react'
import type { BackshopSource } from '@/types/database'

export interface BackshopRuleFilteredRow {
  id: string
  plu: string
  name: string
  backshopSource: BackshopSource
  blockLabel: string
  blockId: string
  thumbUrl: string | null
  productGroupId: string | null
  productGroupMemberCount: number
  productGroupDisplayName: string | null
}

interface BackshopRuleFilteredResponsiveListProps {
  rows: BackshopRuleFilteredRow[]
  canEditLineActions: boolean
  onForceShow: (plu: string, source: BackshopSource) => void
  forceShowPending?: boolean
  onRequestBrandPicker?: (row: BackshopRuleFilteredRow) => void
  findInPage?: ListFindInPageBinding
  /** Standard true; false wenn ein Eltern-Element `data-find-in-scope` setzt */
  attachFindInScope?: boolean
  /** Tutorial-Anker am ersten Eintrag (Desktop + Mobile) */
  firstItemDataTour?: string
}

export function BackshopRuleFilteredResponsiveList({
  rows,
  canEditLineActions,
  onForceShow,
  forceShowPending,
  onRequestBrandPicker,
  findInPage,
  attachFindInScope = true,
  firstItemDataTour,
}: BackshopRuleFilteredResponsiveListProps) {
  return (
    <div
      className="max-w-full min-w-0"
      data-testid="backshop-rule-filtered-list"
      {...(findInPage && attachFindInScope ? { 'data-find-in-scope': findInPage.scopeId } : {})}
    >
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-0">
          <thead>
            <tr className="border-b-2 border-border">
              <th
                className="px-3 py-3 w-28 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                aria-label="Bild"
              />
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[5.5rem]">
                PLU
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                Artikel
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                Marke
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                Warengruppe
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border last:border-b-0 hover:bg-muted/30',
                  listFindInPageRowClassName(rowIndex, findInPage),
                )}
                data-testid="backshop-rule-row"
                {...(findInPage ? { 'data-row-index': rowIndex } : {})}
                {...(firstItemDataTour && rowIndex === 0 ? { 'data-tour': firstItemDataTour } : {})}
              >
                <td className="px-3 py-3 w-28 align-middle">
                  <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                </td>
                <td className="px-3 py-3 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(row.plu)}</td>
                <td className="px-3 py-3 text-sm align-middle min-w-0 break-words">{row.name}</td>
                <td className="px-3 py-3 align-middle min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BackshopSourceBadge source={row.backshopSource} variant="full" />
                    {canEditLineActions &&
                      row.productGroupId &&
                      row.productGroupMemberCount > 1 &&
                      onRequestBrandPicker && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 bg-background gap-1"
                          onClick={() => onRequestBrandPicker(row)}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                          <span className="hidden xl:inline">Marken wählen</span>
                        </Button>
                      )}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-muted-foreground align-middle min-w-0">{row.blockLabel}</td>
                <td className="px-3 py-3 text-right align-middle">
                  {canEditLineActions && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="bshva-btn-primary h-8 border-0"
                      disabled={forceShowPending}
                      onClick={() => onForceShow(row.plu, row.backshopSource)}
                    >
                      <Undo2 className="h-3.5 w-3.5 mr-1" />
                      Einblenden
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-border">
        {rows.map((row, rowIndex) => (
          <li
            key={row.id}
            className={cn('py-3 first:pt-0 px-4', listFindInPageRowClassName(rowIndex, findInPage))}
            data-testid="backshop-rule-row-mobile"
            {...(findInPage ? { 'data-row-index': rowIndex } : {})}
            {...(firstItemDataTour && rowIndex === 0 ? { 'data-tour': firstItemDataTour } : {})}
          >
            <div className="flex gap-2 min-w-0 items-start">
              <div className="shrink-0 pt-0.5">
                <BackshopThumbnail src={row.thumbUrl} size="2xl" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-mono text-sm">{getDisplayPlu(row.plu)}</p>
                <p className="text-sm break-words">{row.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Marke:</span>
                  <BackshopSourceBadge source={row.backshopSource} variant="full" />
                  {canEditLineActions &&
                    row.productGroupId &&
                    row.productGroupMemberCount > 1 &&
                    onRequestBrandPicker && (
                      <Button type="button" variant="outline" size="sm" onClick={() => onRequestBrandPicker(row)}>
                        <GitCompareArrows className="h-3.5 w-3.5 mr-1" />
                        Marken wählen
                      </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Warengruppe: {row.blockLabel}</p>
                <div className="flex flex-col gap-2 pt-1">
                  {canEditLineActions && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="bshva-btn-primary border-0"
                      disabled={forceShowPending}
                      onClick={() => onForceShow(row.plu, row.backshopSource)}
                    >
                      <Undo2 className="h-3.5 w-3.5 mr-1" />
                      Einblenden
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
