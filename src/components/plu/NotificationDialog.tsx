// NotificationDialog: Zeigt neue Produkte einer Version an, mit Ausblend-Option

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EyeOff, Check, Info } from 'lucide-react'
import { useNewProducts, useMarkNotificationRead } from '@/hooks/useNotifications'
import { useHiddenItems, useHideProduct } from '@/hooks/useHiddenItems'
import { getDisplayPlu } from '@/lib/plu-helpers'

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notification: {
    id: string
    version_id: string
    versions?: {
      id: string
      kw_nummer: number
      jahr: number
      kw_label: string
    } | null
  }
}

/**
 * Dialog zum Durchsehen neuer Produkte einer Version.
 * Zeigt alle neuen Produkte (status = NEW_PRODUCT_YELLOW).
 * Ermöglicht das Ausblenden einzelner Produkte und "Gelesen"-Markierung.
 */
export function NotificationDialog({
  open,
  onOpenChange,
  notification,
}: NotificationDialogProps) {
  const versionId = notification.version_id
  const versionInfo = (notification as { versions?: { kw_label: string } }).versions

  // Neue Produkte dieser Version laden
  const { data: newProducts = [] } = useNewProducts(versionId)
  const { data: hiddenItems = [] } = useHiddenItems()
  const hideProduct = useHideProduct()
  const markRead = useMarkNotificationRead()

  // Set der ausgeblendeten PLUs für schnellen Lookup
  const hiddenPLUs = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )

  const handleMarkRead = async () => {
    try {
      await markRead.mutateAsync(versionId)
      onOpenChange(false)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }

  const handleHide = async (plu: string) => {
    try {
      await hideProduct.mutateAsync(plu)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Neue Produkte – {versionInfo?.kw_label ?? 'aktive KW'}
          </DialogTitle>
          <DialogDescription>
            Produkte aus dem letzten Upload. Ausgeblendete erscheinen nicht in der PLU-Liste und im PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
          {newProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Keine neuen Produkte in dieser Version.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {newProducts.length} neue Produkte (gelb = vom Upload)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex align-middle ml-1.5 text-muted-foreground hover:text-foreground rounded p-0.5"
                      aria-label="Was bedeutet Ausblenden?"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] bg-popover text-popover-foreground border shadow-md">
                    <p className="text-xs"><strong>Ausblenden:</strong> Produkt erscheint nicht mehr in PLU-Liste und PDF.</p>
                    <p className="text-xs mt-1"><strong>Gelesen:</strong> Benachrichtigung schließen.</p>
                  </TooltipContent>
                </Tooltip>
              </p>

              <div className="space-y-1.5">
                {newProducts.map((product) => {
                  const isHidden = hiddenPLUs.has(product.plu)

                  return (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between gap-4 rounded-lg px-4 py-3 border-l-4 ${
                        isHidden
                          ? 'bg-muted/50 text-muted-foreground opacity-70 border-l-transparent'
                          : 'bg-background hover:bg-muted/30 border-l-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className={`font-mono text-sm font-medium shrink-0 w-14 ${!isHidden ? 'text-plu-new-text' : ''}`}>
                          {getDisplayPlu(product.plu)}
                        </span>
                        <span className="text-sm truncate flex-1">
                          {product.display_name ?? product.system_name}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {product.item_type === 'PIECE' ? 'Stück' : 'Gewicht'}
                        </Badge>
                      </div>

                      {isHidden ? (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Ausgeblendet
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleHide(product.plu)}
                          disabled={hideProduct.isPending}
                        >
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                          Ausblenden
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleMarkRead}
            disabled={markRead.isPending}
          >
            <Check className="h-4 w-4 mr-2" />
            Gelesen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
