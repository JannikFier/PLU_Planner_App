// BackshopNotificationDialog: Neue und geänderte Backshop-Produkte, mit Ausblend-Option

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
import { EyeOff, Check } from 'lucide-react'
import { useBackshopNewProducts, useBackshopChangedProducts, useBackshopMarkNotificationRead } from '@/hooks/useBackshopNotifications'
import { useBackshopHiddenItems, useBackshopHideProduct } from '@/hooks/useBackshopHiddenItems'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { BackshopMasterPLUItem } from '@/types/database'

interface BackshopNotificationDialogProps {
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
 * Dialog für Backshop: neue und geänderte Produkte der aktiven Backshop-Version,
 * Ausblenden möglich, „Gelesen“ markieren.
 */
export function BackshopNotificationDialog({
  open,
  onOpenChange,
  notification,
}: BackshopNotificationDialogProps) {
  const versionId = notification.version_id
  const versionInfo = notification.versions

  const { data: newProducts = [] } = useBackshopNewProducts(versionId)
  const { data: changedProducts = [] } = useBackshopChangedProducts(versionId)
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const hideProduct = useBackshopHideProduct()
  const markRead = useBackshopMarkNotificationRead()

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
      // Fehler im Hook per Toast
    }
  }

  const handleHide = async (plu: string) => {
    try {
      await hideProduct.mutateAsync(plu)
    } catch {
      // Fehler im Hook per Toast
    }
  }

  const renderProductRow = (
    product: BackshopMasterPLUItem,
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
        </div>

        {isHidden ? (
          <span className="text-xs text-muted-foreground shrink-0">Ausgeblendet</span>
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
            Backshop – {versionInfo?.kw_label ?? 'aktive KW'}
          </DialogTitle>
          <DialogDescription>
            Neue und geänderte Backshop-Produkte aus dem letzten Upload. Ausgeblendete erscheinen nicht in der PLU-Liste und im PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-[200px]">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Keine neuen oder geänderten Backshop-Produkte in dieser Version.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 mb-4 text-xs text-muted-foreground">
                <p><strong>Ausblenden:</strong> Produkt erscheint nicht mehr in Backshop-Liste und PDF.</p>
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
          <Button onClick={handleMarkRead} disabled={markRead.isPending}>
            <Check className="h-4 w-4 mr-2" />
            Gelesen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
