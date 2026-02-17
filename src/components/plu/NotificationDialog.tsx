// NotificationDialog: Zeigt neue und geänderte Produkte einer Version an, mit Ausblend-Option

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
import { EyeOff, Check } from 'lucide-react'
import { useNewProducts, useChangedProducts, useMarkNotificationRead } from '@/hooks/useNotifications'
import { useHiddenItems, useHideProduct } from '@/hooks/useHiddenItems'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { MasterPLUItem } from '@/types/database'

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
 * Dialog zum Durchsehen neuer und geänderter Produkte einer Version.
 * Zeigt neue Produkte (NEW_PRODUCT_YELLOW) und geänderte PLUs (PLU_CHANGED_RED).
 * Ermöglicht das Ausblenden einzelner Produkte und "Gelesen"-Markierung.
 */
export function NotificationDialog({
  open,
  onOpenChange,
  notification,
}: NotificationDialogProps) {
  const versionId = notification.version_id
  const versionInfo = (notification as { versions?: { kw_label: string } }).versions

  const { data: newProducts = [] } = useNewProducts(versionId)
  const { data: changedProducts = [] } = useChangedProducts(versionId)
  const { data: hiddenItems = [] } = useHiddenItems()
  const hideProduct = useHideProduct()
  const markRead = useMarkNotificationRead()

  const hiddenPLUs = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )

  const isEmpty = newProducts.length === 0 && changedProducts.length === 0

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

  const renderProductRow = (
    product: MasterPLUItem,
    options: { isNew: boolean; showOldPlu?: boolean },
  ) => {
    const isHidden = hiddenPLUs.has(product.plu)
    const { isNew, showOldPlu = false } = options
    const oldPlu = product.old_plu ?? null

    return (
      <div
        key={product.id}
        className={cn(
          'flex items-center justify-between gap-4 rounded-lg px-4 py-3 border-l-4',
          isHidden
            ? 'bg-muted/50 text-muted-foreground opacity-70 border-l-transparent'
            : isNew
              ? 'bg-background hover:bg-muted/30 border-l-amber-400'
              : 'bg-background hover:bg-muted/30 border-l-[var(--color-plu-changed)]'
        )}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <span
            className={cn(
              'font-mono text-sm font-medium shrink-0 w-14',
              !isHidden && (isNew ? 'text-plu-new-text' : 'text-plu-changed-text'),
            )}
          >
            {getDisplayPlu(product.plu)}
          </span>
          <span className="text-sm break-words min-w-0 flex-1">
            {product.display_name ?? product.system_name}
            {showOldPlu && oldPlu && (
              <span className="block text-xs text-muted-foreground mt-0.5">
                Ehemals PLU {getDisplayPlu(oldPlu)}
              </span>
            )}
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Benachrichtigung – {versionInfo?.kw_label ?? 'aktive KW'}
          </DialogTitle>
          <DialogDescription>
            Neue und geänderte Produkte aus dem letzten Upload. Ausgeblendete erscheinen nicht in der PLU-Liste und im PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Keine neuen oder geänderten Produkte in dieser Version.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 mb-4 text-xs text-muted-foreground">
                <p><strong>Ausblenden:</strong> Produkt erscheint nicht mehr in PLU-Liste und PDF.</p>
                <p className="mt-1"><strong>Gelesen:</strong> Benachrichtigung schließen.</p>
              </div>

              {newProducts.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    {newProducts.length} neue Produkte (diese Woche hinzugefügt)
                  </p>
                  <div className="space-y-1.5">
                    {newProducts.map((p) => renderProductRow(p, { isNew: true }))}
                  </div>
                </div>
              )}

              {changedProducts.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {changedProducts.length} geänderte PLUs
                  </p>
                  <div className="space-y-1.5">
                    {changedProducts.map((p) =>
                      renderProductRow(p, { isNew: false, showOldPlu: true }),
                    )}
                  </div>
                </div>
              )}
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
