// Eigene Produkte Backshop: Desktop-Tabelle mit Bild, Mobile kompakte Zeilen

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { cn } from '@/lib/utils'
import type { BackshopCustomProduct } from '@/types/database'
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'

const mobileIconBtnClass = 'h-10 w-10 shrink-0 md:h-8 md:w-8'

export interface BackshopCustomProductsListProps {
  products: BackshopCustomProduct[]
  blocks: Array<{ id: string; name: string }>
  currentUserId: string | null
  isHidden: (plu: string) => boolean
  onEdit: (product: BackshopCustomProduct) => void
  onDelete: (product: BackshopCustomProduct) => void
  onHide: (plu: string) => void
  onUnhide: (plu: string) => void
  hidePending: boolean
  unhidePending: boolean
  deletePending: boolean
  /** false z. B. für Super-Admin */
  allowHideUnhide?: boolean
}

export function BackshopCustomProductsList({
  products,
  blocks,
  currentUserId,
  isHidden,
  onEdit,
  onDelete,
  onHide,
  onUnhide,
  hidePending,
  unhidePending,
  deletePending,
  allowHideUnhide = true,
}: BackshopCustomProductsListProps) {
  const blockName = (blockId: string | null) => blocks.find((b) => b.id === blockId)?.name ?? '–'

  const thumb = (cp: BackshopCustomProduct) => <BackshopThumbnail src={cp.image_url} size="lg" />

  return (
    <div className="max-w-full min-w-0">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-0">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                Bild
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                PLU
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                Warengruppe
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((cp) => {
              const rowHidden = isHidden(cp.plu)
              return (
                <tr key={cp.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{thumb(cp)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(cp.plu)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 flex-wrap">
                      {cp.name}
                      {currentUserId && cp.created_by === currentUserId && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Von mir
                        </Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{blockName(cp.block_id)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => onEdit(cp)} aria-label="Bearbeiten">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Name und Bild bearbeiten</TooltipContent>
                      </Tooltip>
                      {allowHideUnhide && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => (rowHidden ? onUnhide(cp.plu) : onHide(cp.plu))}
                            disabled={hidePending || unhidePending}
                            aria-label={rowHidden ? 'Einblenden' : 'Ausblenden'}
                          >
                            {rowHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{rowHidden ? 'Einblenden' : 'Ausblenden'}</TooltipContent>
                      </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(cp)}
                            disabled={deletePending}
                            aria-label="Löschen"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Produkt löschen</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-border" data-testid="backshop-custom-products-mobile-list">
        {products.map((cp) => {
          const rowHidden = isHidden(cp.plu)
          return (
            <li key={cp.id} className="py-3 first:pt-0">
              <div className="flex gap-2 min-w-0 items-start">
                <div className="shrink-0 pt-0.5">{thumb(cp)}</div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="font-mono text-sm">{getDisplayPlu(cp.plu)}</p>
                  <p className="text-sm break-words mt-0.5">{cp.name}</p>
                  {currentUserId && cp.created_by === currentUserId && (
                    <span className="text-xs text-muted-foreground">Von mir</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 break-words">{blockName(cp.block_id)}</p>
                </div>
                <div className="flex shrink-0 gap-0.5 items-start pt-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={mobileIconBtnClass}
                        onClick={() => onEdit(cp)}
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
                        onClick={() => (rowHidden ? onUnhide(cp.plu) : onHide(cp.plu))}
                        disabled={hidePending || unhidePending}
                        aria-label={rowHidden ? 'Einblenden' : 'Ausblenden'}
                      >
                        {rowHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{rowHidden ? 'Einblenden' : 'Ausblenden'}</TooltipContent>
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
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
