// Backshop: Inhalt der Benachrichtigung (Liste + Gelesen) – ohne äußeren Dialog

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { EyeOff, Check } from 'lucide-react'
import {
  useBackshopNewProducts,
  useBackshopChangedProducts,
  useBackshopMarkNotificationRead,
} from '@/hooks/useBackshopNotifications'
import { useLocation } from 'react-router-dom'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { useBackshopHiddenItems, useBackshopHideProduct } from '@/hooks/useBackshopHiddenItems'
import { useBackshopOfferCampaignWithLines } from '@/hooks/useCentralOfferCampaigns'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { BackshopMasterPLUItem } from '@/types/database'

export interface BackshopNotificationPanelProps {
  versionId: string
  /** Hinweisbox – nur bei ungelesener Benachrichtigung */
  showInfoHint: boolean
  onAfterMarkRead?: () => void
}

export function BackshopNotificationPanel({
  versionId,
  showInfoHint,
  onAfterMarkRead,
}: BackshopNotificationPanelProps) {
  const { pathname } = useLocation()
  const effectiveRole = useEffectiveRouteRole()
  const canHide = canManageMarketHiddenItems(effectiveRole, pathname)

  const { data: newProducts = [] } = useBackshopNewProducts(versionId)
  const { data: changedProducts = [] } = useBackshopChangedProducts(versionId)
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const hideProduct = useBackshopHideProduct()
  const markRead = useBackshopMarkNotificationRead()

  const hiddenPLUs = useMemo(
    () =>
      effectiveHiddenPluSet(new Set(hiddenItems.map((h) => h.plu)), backshopCampaign?.lines),
    [hiddenItems, backshopCampaign?.lines],
  )

  const isEmpty = newProducts.length === 0 && changedProducts.length === 0

  const handleMarkRead = async () => {
    try {
      await markRead.mutateAsync(versionId)
      onAfterMarkRead?.()
    } catch {
      // Toast im Hook
    }
  }

  const handleHide = async (plu: string) => {
    try {
      await hideProduct.mutateAsync(plu)
    } catch {
      // Toast im Hook
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
              : 'bg-background hover:bg-muted/30 border-l-[var(--color-plu-changed)]',
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
        ) : canHide ? (
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
        ) : (
          <span className="text-xs text-muted-foreground shrink-0 max-w-[10rem] text-right">
            Nur Markt-Personal
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 overflow-y-auto py-1 min-h-[120px]">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine neuen oder geänderten Backshop-Produkte in dieser Version.
          </p>
        ) : (
          <>
            {showInfoHint && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 mb-4 text-xs text-muted-foreground">
                {canHide ? (
                  <p>
                    <strong>Ausblenden:</strong> Produkt erscheint nicht mehr in Backshop-Liste und PDF.
                  </p>
                ) : (
                  <p>Als Super-Admin kannst du hier nicht ausblenden – das erledigt der jeweilige Markt.</p>
                )}
                <p className="mt-1">
                  <strong>Gelesen:</strong> Benachrichtigung schließen.
                </p>
              </div>
            )}

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
                <p className="text-sm text-muted-foreground mb-2">{changedProducts.length} geänderte PLUs</p>
                <div className="space-y-1.5">
                  {changedProducts.map((p) => renderProductRow(p, { isNew: false, showOldPlu: true }))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={handleMarkRead} disabled={markRead.isPending}>
          <Check className="h-4 w-4 mr-2" />
          Gelesen
        </Button>
      </div>
    </div>
  )
}
