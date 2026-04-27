// Umbenannte Produkte: Desktop-Tabelle + Mobile-Liste (Obst/Gemüse oder Backshop)

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { listFindInPageRowClassName, type ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { Undo2 } from 'lucide-react'

const mobileIconBtnClass = 'h-10 w-10 shrink-0'

export interface RenamedProductDisplayRow {
  plu: string
  systemName: string
  currentName: string
  /** Nur Backshop */
  thumbUrl: string | null
  onReset: () => void
}

export interface RenamedProductsResponsiveListProps {
  variant: 'obst' | 'backshop'
  rows: RenamedProductDisplayRow[]
  resetPending: boolean
  findInPage?: ListFindInPageBinding
  /** Optional: Tutorial-Anker am ersten Eintrag (Desktop-Zeile + Mobile-Karte) */
  firstItemDataTour?: string
  /** Optional: Tutorial-Anker am Zuruecksetzen-Button auf der ersten Zeile/Karte */
  firstResetButtonDataTour?: string
}

export function RenamedProductsResponsiveList({
  variant,
  rows,
  resetPending,
  findInPage,
  firstItemDataTour,
  firstResetButtonDataTour,
}: RenamedProductsResponsiveListProps) {
  const isBackshop = variant === 'backshop'

  return (
    <div
      className="max-w-full min-w-0"
      data-testid="renamed-products-scroll-root"
      {...(findInPage ? { 'data-find-in-scope': findInPage.scopeId } : {})}
    >
      <div className="hidden md:block overflow-x-auto">
        <table className={cn('w-full min-w-0', !isBackshop && 'table-fixed')}>
          {!isBackshop && (
            <colgroup>
              <col className="w-[5.5rem]" />
              <col className="w-[36%]" />
              <col className="w-[36%]" />
              <col className="w-[11rem]" />
            </colgroup>
          )}
          <thead>
            <tr className="border-b-2 border-border">
              {isBackshop && (
                <th
                  className="px-3 py-3 w-28 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  aria-label="Bild"
                />
              )}
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[5.5rem]">
                PLU
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                Original
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                Aktuell
              </th>
              <th className="px-3 py-3 text-right w-[11rem]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.plu}
                className={cn(
                  'border-b border-border last:border-b-0 hover:bg-muted/30',
                  listFindInPageRowClassName(rowIndex, findInPage),
                )}
                {...(findInPage ? { 'data-row-index': rowIndex } : {})}
                {...(firstItemDataTour && rowIndex === 0
                  ? { 'data-tour': firstItemDataTour }
                  : {})}
              >
                {isBackshop && (
                  <td className="px-3 py-3 w-28 align-middle">
                    <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                  </td>
                )}
                <td className="px-3 py-3 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(row.plu)}</td>
                <td className="px-3 py-3 text-sm text-muted-foreground align-middle break-words min-w-0">
                  {row.systemName}
                </td>
                <td className="px-3 py-3 text-sm align-middle break-words min-w-0">{row.currentName}</td>
                <td className="px-3 py-3 text-right align-middle">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={row.onReset}
                    disabled={resetPending}
                    {...(firstResetButtonDataTour && rowIndex === 0
                      ? { 'data-tour': firstResetButtonDataTour }
                      : {})}
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Zurücksetzen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-border" data-testid="renamed-products-mobile-list">
        {rows.map((row, rowIndex) => (
          <li
            key={row.plu}
            className={cn('py-3 first:pt-0 px-4', listFindInPageRowClassName(rowIndex, findInPage))}
            {...(findInPage ? { 'data-row-index': rowIndex } : {})}
            {...(firstItemDataTour && rowIndex === 0
              ? { 'data-tour': firstItemDataTour }
              : {})}
          >
            <div className="flex gap-2 min-w-0 items-start">
              {isBackshop && (
                <div className="shrink-0 pt-0.5">
                  <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-mono text-sm">{getDisplayPlu(row.plu)}</p>
                <p className="text-xs text-muted-foreground break-words">
                  <span className="font-medium">Original:</span> {row.systemName}
                </p>
                <p className="text-sm break-words">
                  <span className="font-medium text-muted-foreground">Aktuell:</span> {row.currentName}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className={mobileIconBtnClass}
                    onClick={row.onReset}
                    disabled={resetPending}
                    aria-label="Zurücksetzen"
                    {...(firstResetButtonDataTour && rowIndex === 0
                      ? { 'data-tour': firstResetButtonDataTour }
                      : {})}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Zurücksetzen</TooltipContent>
              </Tooltip>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
