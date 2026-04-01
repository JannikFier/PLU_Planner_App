// Gemeinsame Liste „Eigene Produkte“ Obst/Gemüse: Desktop-Tabelle, Mobile kompakte Zeilen (ab md wie Desktop)

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPreisEur, getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { CustomProduct } from '@/types/database'
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

export type ObstCustomProductsListContext = 'full' | 'hidden-items'

export interface ObstCustomProductsListProps {
  products: CustomProduct[]
  blocks: Array<{ id: string; name: string }>
  context: ObstCustomProductsListContext
  currentUserId: string | null
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  /** true wenn mindestens ein Produkt einen Preis hat (zweite Zeile Mobile / Spalte Desktop) */
  /** Für Mobile-Metazeile: Preis nur anzeigen wenn mindestens ein Eintrag einen Preis hat */
  hasAnyPrice: boolean
  isHidden: (plu: string) => boolean
  onEdit?: (product: CustomProduct) => void
  onDelete: (product: CustomProduct) => void
  onHide: (plu: string) => void
  /** Nur context full: Einblenden wenn Produkt ausgeblendet */
  onUnhide?: (plu: string) => void
  hidePending: boolean
  unhidePending: boolean
  deletePending: boolean
  /** false z. B. für Super-Admin: keine Ausblend-/Einblend-Aktionen am Markt */
  allowHideUnhide?: boolean
}

/** Touch-freundliche Icon-Größe nur auf schmalen Viewports */
const mobileIconBtnClass = 'h-10 w-10 shrink-0 md:h-8 md:w-8'

export function ObstCustomProductsList({
  products,
  blocks,
  context,
  currentUserId,
  sortMode,
  hasAnyPrice,
  isHidden,
  onEdit,
  onDelete,
  onHide,
  onUnhide,
  hidePending,
  unhidePending,
  deletePending,
  allowHideUnhide = true,
}: ObstCustomProductsListProps) {
  const showWarengruppeMeta = sortMode === 'BY_BLOCK'
  const isFull = context === 'full'

  const blockName = (blockId: string | null) => blocks.find((b) => b.id === blockId)?.name ?? '–'

  return (
    <div className="max-w-full min-w-0">
      {/* Desktop: Tabelle */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-0 table-fixed">
          <colgroup>
            <col className="w-[5.5rem]" />
            <col className="w-[42%]" />
            <col className="w-[6rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[15%]" />
            <col className={cn(isFull ? 'w-[11rem]' : 'w-[9.5rem]')} />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                PLU
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-0">
                Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Typ
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preis
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Warengruppe
              </th>
              <th
                className={cn(
                  'px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider',
                )}
              >
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((cp) => {
              const rowHidden = isFull ? isHidden(cp.plu) : false
              return (
                <tr key={cp.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-sm align-middle whitespace-nowrap">{getDisplayPlu(cp.plu)}</td>
                  <td className="px-3 py-3 text-sm align-middle min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      {cp.name}
                      {currentUserId && cp.created_by === currentUserId && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Von mir erstellt
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground align-middle whitespace-nowrap">
                    {cp.item_type === 'PIECE' ? 'Stück' : 'Gewicht'}
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground align-middle whitespace-nowrap">
                    {cp.preis != null ? formatPreisEur(cp.preis) : '–'}
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground align-middle break-words">
                    {blockName(cp.block_id)}
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    {isFull ? (
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEdit?.(cp)}
                              aria-label="Bearbeiten"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Name, Typ und Preis bearbeiten</TooltipContent>
                        </Tooltip>
                        {allowHideUnhide && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => (rowHidden ? onUnhide?.(cp.plu) : onHide(cp.plu))}
                              disabled={hidePending || unhidePending}
                              aria-label={rowHidden ? 'Einblenden' : 'Ausblenden'}
                            >
                              {rowHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {rowHidden
                              ? 'Produkt in der PLU-Liste wieder einblenden'
                              : 'Produkt aus der PLU-Liste ausblenden'}
                          </TooltipContent>
                        </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDelete(cp)}
                              disabled={deletePending}
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Produkt unwiderruflich löschen</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        {allowHideUnhide && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onHide(cp.plu)}
                          disabled={hidePending}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Ausblenden
                        </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(cp)}
                          disabled={deletePending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Löschen
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: kompakte Liste (kein horizontales Scrollen der Seite) */}
      <ul className="md:hidden divide-y divide-border" data-testid="obst-custom-products-mobile-list">
        {products.map((cp) => {
          const rowHidden = isFull ? isHidden(cp.plu) : false
          const metaParts: string[] = []
          metaParts.push(cp.item_type === 'PIECE' ? 'Stück' : 'Gewicht')
          if (hasAnyPrice && cp.preis != null) metaParts.push(formatPreisEur(cp.preis))
          if (showWarengruppeMeta) metaParts.push(blockName(cp.block_id))
          const metaLine = metaParts.join(' · ')

          return (
            <li key={cp.id} className="py-3 first:pt-0">
              <div className="flex gap-2 min-w-0 items-start">
                <span className="font-mono text-sm shrink-0 pt-2">{getDisplayPlu(cp.plu)}</span>
                <div className="min-w-0 flex-1 pt-2">
                  <p className="text-sm break-words">{cp.name}</p>
                  {metaLine.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 break-words">{metaLine}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 items-start pt-1">
                  {isFull && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={mobileIconBtnClass}
                            onClick={() => onEdit?.(cp)}
                            aria-label="Bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Bearbeiten</TooltipContent>
                      </Tooltip>
                      {allowHideUnhide && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={mobileIconBtnClass}
                            onClick={() => (rowHidden ? onUnhide?.(cp.plu) : onHide(cp.plu))}
                            disabled={hidePending || unhidePending}
                            aria-label={rowHidden ? 'Einblenden' : 'Ausblenden'}
                          >
                            {rowHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          {rowHidden ? 'Einblenden' : 'Ausblenden'}
                        </TooltipContent>
                      </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(mobileIconBtnClass, 'text-destructive hover:text-destructive')}
                            onClick={() => onDelete(cp)}
                            disabled={deletePending}
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Löschen</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {!isFull && (
                    <>
                      {allowHideUnhide && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={mobileIconBtnClass}
                            onClick={() => onHide(cp.plu)}
                            disabled={hidePending}
                            aria-label="Ausblenden"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Ausblenden</TooltipContent>
                      </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={cn(mobileIconBtnClass, 'text-destructive hover:text-destructive')}
                            onClick={() => onDelete(cp)}
                            disabled={deletePending}
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Löschen</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
