// Ausgeblendete Produkte: Desktop-Tabelle + Mobile-Liste (Obst/Gemüse oder Backshop)

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { Pencil, Undo2 } from 'lucide-react'

const mobileIconBtnClass = 'h-10 w-10 shrink-0'

/** Zeile für die gemeinsame Obst-/Backshop-Ansicht */
export interface HiddenProductDisplayRow {
  plu: string
  name: string
  hiddenByName: string
  hidden_by: string
  showVonMirBadge: boolean
  source: 'master' | 'custom' | 'unknown'
  showCentralCampaignBadge: boolean
  /** Nur Obst/Gemüse: Stück / Gewicht / – */
  typLabel: string | null
  /** Nur Backshop: Vorschaubild */
  thumbUrl: string | null
  /** Wenn gesetzt: Bearbeiten-Button (eigenes Produkt) */
  onEdit?: () => void
}

export interface HiddenProductsResponsiveListProps {
  variant: 'obst' | 'backshop'
  rows: HiddenProductDisplayRow[]
  canManageHidden: boolean
  unhidePending: boolean
  onUnhide: (plu: string) => void
}

function NameBadges({
  name,
  row,
}: {
  name: string
  row: HiddenProductDisplayRow
}) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="break-words min-w-0">{name}</span>
      {row.source === 'custom' && (
        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 shrink-0">
          Eigen
        </Badge>
      )}
      {row.source === 'unknown' && (
        <Badge variant="secondary" className="text-xs shrink-0">
          Unbekannt
        </Badge>
      )}
      {row.showCentralCampaignBadge && (
        <Badge
          variant="outline"
          className="text-xs shrink-0 border-primary/40 text-primary max-w-full"
          title="In der Hauptliste sichtbar, solange diese PLU in der zentralen Werbekampagne steht. Einblenden entfernt die Ausblendung dauerhaft."
        >
          Sichtbar durch Werbung
        </Badge>
      )}
    </span>
  )
}

export function HiddenProductsResponsiveList({
  variant,
  rows,
  canManageHidden,
  unhidePending,
  onUnhide,
}: HiddenProductsResponsiveListProps) {
  const isBackshop = variant === 'backshop'

  return (
    <div className="max-w-full min-w-0" data-testid="hidden-products-scroll-root">
      <div className="hidden md:block overflow-x-auto">
        <table className={cn('w-full min-w-0', !isBackshop && 'table-fixed')}>
          {!isBackshop && (
            <colgroup>
              <col className="w-[5.5rem]" />
              <col className="w-[38%]" />
              <col className="w-[6rem]" />
              <col className="w-[14%]" />
              <col className="w-[12rem]" />
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
                Artikel
              </th>
              {!isBackshop && (
                <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Typ
                </th>
              )}
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground/90 uppercase tracking-wider">
                Ausgeblendet von
              </th>
              <th className="px-3 py-3 text-right w-[12rem]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.plu} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                {isBackshop && (
                  <td className="px-3 py-3 w-28 align-middle">
                    <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                  </td>
                )}
                <td className="px-3 py-3 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(row.plu)}</td>
                <td className="px-3 py-3 text-sm align-middle min-w-0">
                  <NameBadges name={row.name} row={row} />
                </td>
                {!isBackshop && (
                  <td className="px-3 py-3 text-sm text-muted-foreground align-middle whitespace-nowrap">
                    {row.typLabel ?? '–'}
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-muted-foreground align-middle">
                  <span className="flex flex-wrap items-center gap-2">
                    {row.hiddenByName}
                    {row.showVonMirBadge && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Von mir
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="px-3 py-3 text-right align-middle">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {row.onEdit && (
                      <Button variant="ghost" size="sm" onClick={row.onEdit}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Bearbeiten
                      </Button>
                    )}
                    {canManageHidden ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUnhide(row.plu)}
                        disabled={unhidePending}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        Einblenden
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-border" data-testid="hidden-products-mobile-list">
        {rows.map((row) => (
          <li key={row.plu} className="py-3 first:pt-0 px-4">
            <div className="flex gap-2 min-w-0 items-start">
              {isBackshop && (
                <div className="shrink-0 pt-0.5">
                  <BackshopThumbnail src={row.thumbUrl} size="2xl" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-mono text-sm">{getDisplayPlu(row.plu)}</p>
                <div className="text-sm">
                  <NameBadges name={row.name} row={row} />
                </div>
                {!isBackshop && row.typLabel != null && (
                  <p className="text-xs text-muted-foreground">Typ: {row.typLabel}</p>
                )}
                <p className="text-xs text-muted-foreground break-words">
                  Ausgeblendet von: {row.hiddenByName}
                  {row.showVonMirBadge && (
                    <Badge variant="secondary" className="text-xs ml-1 align-middle">
                      Von mir
                    </Badge>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5 items-start pt-0.5">
                {row.onEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={mobileIconBtnClass}
                        onClick={row.onEdit}
                        aria-label="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Bearbeiten</TooltipContent>
                  </Tooltip>
                )}
                {canManageHidden && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={mobileIconBtnClass}
                        onClick={() => onUnhide(row.plu)}
                        disabled={unhidePending}
                        aria-label="Einblenden"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Einblenden</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
