// Backshop: Benachrichtigung mit Tabs (Neu / Geändert / Rausgefallen) + optional Transfer-Woche

import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EyeOff, Check } from 'lucide-react'
import {
  useBackshopNewProducts,
  useBackshopChangedProducts,
  useBackshopMarkNotificationRead,
} from '@/hooks/useBackshopNotifications'
import { useLocation } from 'react-router-dom'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { useBackshopHiddenItems, useBackshopHideProduct, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useBackshopOfferCampaignWithLines } from '@/hooks/useCentralOfferCampaigns'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { BackshopMasterPLUItem } from '@/types/database'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { getPreviousVersionId } from '@/lib/version-plu-diff'
import { useTransitionRemovedBackshopItems } from '@/hooks/useTransitionRemovedItems'
import { useStoreListCarryoverRows, useUpsertStoreListCarryover } from '@/hooks/useStoreListCarryover'
import { isCarryoverDecisionBlockedBerlin } from '@/lib/carryover-decision-window'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useStartBackshopTransferWeek } from '@/hooks/useStartBackshopTransferWeek'

export interface BackshopNotificationPanelProps {
  versionId: string
  showInfoHint: boolean
  onAfterMarkRead?: () => void
}

type BackshopNotificationTab = 'new' | 'changed' | 'removed'

function BackshopNotificationTabbedList({
  defaultTab,
  newProducts,
  changedProducts,
  removedProducts,
  previousVersionId,
  removedLoading,
  renderProductRow,
  renderRemovedRow,
}: {
  defaultTab: BackshopNotificationTab
  newProducts: BackshopMasterPLUItem[]
  changedProducts: BackshopMasterPLUItem[]
  removedProducts: BackshopMasterPLUItem[]
  previousVersionId: string | null
  removedLoading: boolean
  renderProductRow: (
    product: BackshopMasterPLUItem,
    options: { isNew: boolean; showOldPlu?: boolean; tagFirstHideButton?: boolean },
  ) => ReactNode
  renderRemovedRow: (product: BackshopMasterPLUItem, options: { tagFirstCarryover?: boolean }) => ReactNode
}) {
  const [tab, setTab] = useState<BackshopNotificationTab>(defaultTab)
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as BackshopNotificationTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto flex-wrap gap-1">
        <TabsTrigger value="new" className="text-xs sm:text-sm" data-tour="backshop-notification-tab-new">
          Neu <Badge variant="secondary" className="ml-1 tabular-nums">{newProducts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="changed" className="text-xs sm:text-sm" data-tour="backshop-notification-tab-changed">
          Geändert <Badge variant="secondary" className="ml-1 tabular-nums">{changedProducts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="removed" className="text-xs sm:text-sm" data-tour="backshop-notification-tab-removed">
          Raus <Badge variant="secondary" className="ml-1 tabular-nums">{removedProducts.length}</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="new"
        className="mt-4 space-y-1.5 min-h-[80px]"
        {...(tab === 'new' ? { 'data-tour': 'backshop-notification-content' } : {})}
      >
        {newProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine neuen Produkte.</p>
        ) : (
          newProducts.map((p, idx) =>
            renderProductRow(p, {
              isNew: true,
              tagFirstHideButton: idx === 0,
            }),
          )
        )}
      </TabsContent>
      <TabsContent
        value="changed"
        className="mt-4 space-y-1.5 min-h-[80px]"
        {...(tab === 'changed' ? { 'data-tour': 'backshop-notification-content' } : {})}
      >
        {changedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine geänderten PLUs.</p>
        ) : (
          changedProducts.map((p, idx) =>
            renderProductRow(p, {
              isNew: false,
              showOldPlu: true,
              tagFirstHideButton: newProducts.length === 0 && idx === 0,
            }),
          )
        )}
      </TabsContent>
      <TabsContent
        value="removed"
        className="mt-4 space-y-3 min-h-[80px]"
        {...(tab === 'removed' ? { 'data-tour': 'backshop-notification-content' } : {})}
      >
        {!previousVersionId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Keine Vorversion zum Vergleichen (erste eingespielte Liste).
          </p>
        ) : removedLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Lade …</p>
        ) : removedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine entfernten PLUs.</p>
        ) : (
          removedProducts.map((p, idx) => renderRemovedRow(p, { tagFirstCarryover: idx === 0 }))
        )}
      </TabsContent>
    </Tabs>
  )
}

export function BackshopNotificationPanel({
  versionId,
  showInfoHint,
  onAfterMarkRead,
}: BackshopNotificationPanelProps) {
  const { pathname } = useLocation()
  const effectiveRole = useEffectiveRouteRole()
  const canHide = canManageMarketHiddenItems(effectiveRole, pathname)
  const canCarryover = canHide

  const { data: versions = [] } = useBackshopVersions()
  const versionMeta = useMemo(() => versions.find((v) => v.id === versionId), [versions, versionId])

  const previousVersionId = useMemo(
    () => getPreviousVersionId(versions, versionId),
    [versions, versionId],
  )

  const { data: newProducts = [] } = useBackshopNewProducts(versionId)
  const { data: changedProducts = [] } = useBackshopChangedProducts(versionId)
  const { data: removedProducts = [], isLoading: removedLoading } = useTransitionRemovedBackshopItems(
    versionId,
    previousVersionId ?? undefined,
  )
  const { data: carryoverRows = [] } = useStoreListCarryoverRows('backshop', versionId)

  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const hideProduct = useBackshopHideProduct()
  const unhideProduct = useBackshopUnhideProduct()
  const markRead = useBackshopMarkNotificationRead()
  const upsertCarryover = useUpsertStoreListCarryover()
  const startTransferWeek = useStartBackshopTransferWeek()

  const hiddenPLUs = useMemo(
    () =>
      effectiveHiddenPluSet(new Set(hiddenItems.map((h) => h.plu)), backshopCampaign),
    [hiddenItems, backshopCampaign],
  )

  const rawHiddenSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])

  const publishedAt = versionMeta?.published_at ?? null
  const decisionBlocked = isCarryoverDecisionBlockedBerlin(publishedAt)

  const carryByPlu = useMemo(() => new Map(carryoverRows.map((r) => [r.plu, r])), [carryoverRows])

  const defaultTab = useMemo((): BackshopNotificationTab => {
    if (newProducts.length > 0) return 'new'
    if (changedProducts.length > 0) return 'changed'
    if (removedProducts.length > 0) return 'removed'
    return 'new'
  }, [newProducts.length, changedProducts.length, removedProducts.length])

  const isTotallyEmpty =
    newProducts.length === 0 && changedProducts.length === 0 && removedProducts.length === 0

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

  const setMarketInclude = async (product: BackshopMasterPLUItem, include: boolean) => {
    if (!previousVersionId) return
    try {
      await upsertCarryover.mutateAsync({
        listType: 'backshop',
        forVersionId: versionId,
        fromVersionId: previousVersionId,
        item: product,
        marketInclude: include,
      })
      if (include) {
        await unhideProduct.mutateAsync(product.plu)
      }
    } catch {
      // Toast im Mutation-Hook
    }
  }

  const renderProductRow = (
    product: BackshopMasterPLUItem,
    options: { isNew: boolean; showOldPlu?: boolean; tagFirstHideButton?: boolean },
  ) => {
    const isHidden = hiddenPLUs.has(product.plu)
    const { isNew, showOldPlu = false, tagFirstHideButton = false } = options
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
            {...(tagFirstHideButton ? { 'data-tour': 'backshop-notification-hide-button' } : {})}
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

  const renderRemovedRow = (product: BackshopMasterPLUItem, options: { tagFirstCarryover?: boolean } = {}) => {
    const row = carryByPlu.get(product.plu)
    const include = row?.market_include ?? false
    const wasHidden = rawHiddenSet.has(product.plu)
    const tagFirstCarryover = options.tagFirstCarryover ?? false
    const statusLine =
      row?.updated_at && row.last_editor_label
        ? `Markt: ${include ? 'wieder in Liste' : 'nicht in Liste'} · zuletzt ${row.last_editor_label}, ${format(new Date(row.updated_at), 'd. MMM HH:mm', { locale: de })}`
        : row?.updated_at
          ? `Markt: ${include ? 'wieder in Liste' : 'nicht in Liste'} · ${format(new Date(row.updated_at), 'd. MMM HH:mm', { locale: de })}`
          : null

    return (
      <div
        key={product.plu}
        className={cn(
          'flex flex-col gap-2 rounded-lg px-4 py-3 border-l-4 border-l-muted-foreground/70 bg-muted/20',
          wasHidden && 'bg-muted/40',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-medium shrink-0 w-14">{getDisplayPlu(product.plu)}</span>
          <span className="text-sm break-words min-w-0 flex-1">
            {product.display_name ?? product.system_name}
          </span>
          <Badge variant="outline" className="text-xs shrink-0">
            Rausgefallen
          </Badge>
          {wasHidden ? (
            <Badge variant="secondary" className="text-xs shrink-0">
              War ausgeblendet
            </Badge>
          ) : null}
        </div>
        {statusLine ? <p className="text-xs text-muted-foreground">{statusLine}</p> : null}
        {canCarryover ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={include ? 'default' : 'outline'}
              disabled={decisionBlocked || upsertCarryover.isPending}
              onClick={() => void setMarketInclude(product, true)}
              {...(tagFirstCarryover ? { 'data-tour': 'backshop-notification-carryover-button' } : {})}
            >
              Eine KW in Liste
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!include ? 'default' : 'outline'}
              disabled={decisionBlocked || upsertCarryover.isPending}
              onClick={() => void setMarketInclude(product, false)}
            >
              Nicht übernehmen
            </Button>
            {decisionBlocked ? (
              <span className="text-xs text-muted-foreground">Freitag/Samstag: Entscheidung gesperrt</span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nur Markt-Personal kann die Liste anpassen.</p>
        )}
      </div>
    )
  }

  const showTransferBanner =
    canCarryover && versionMeta?.status === 'active' && !versionMeta.transfer_week_started_at

  return (
    <div className="flex flex-col gap-4" data-tour="backshop-notification-panel">
      {showTransferBanner ? (
        <div
          className="rounded-lg border border-border bg-card px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          data-tour="backshop-notification-transfer-banner"
        >
          <p className="text-xs text-muted-foreground">
            Backshop-Liste wurde aktualisiert. Bitte bestätige die <strong>Transfer-Woche</strong>, damit
            Carryover-Entscheidungen eindeutig zugeordnet sind.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={startTransferWeek.isPending}
            onClick={() => void startTransferWeek.mutateAsync()}
          >
            Transfer-Woche bestätigen
          </Button>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-1 min-h-[120px]">
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
              <strong>Gelesen:</strong> Badge an der Glocke verschwindet; Inhalt bleibt über die Glocke abrufbar.
              Der Dialog schließt, wenn alle sichtbaren Bereiche (Obst/Backshop) gelesen sind.
            </p>
          </div>
        )}

        {isTotallyEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Keine Änderungen gegenüber der Vorversion in dieser Backshop-Liste.
          </p>
        ) : (
          <BackshopNotificationTabbedList
            key={`${versionId}-${defaultTab}`}
            defaultTab={defaultTab}
            newProducts={newProducts}
            changedProducts={changedProducts}
            removedProducts={removedProducts}
            previousVersionId={previousVersionId}
            removedLoading={removedLoading}
            renderProductRow={renderProductRow}
            renderRemovedRow={renderRemovedRow}
          />
        )}
      </div>

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          onClick={handleMarkRead}
          disabled={markRead.isPending}
          data-tour="backshop-notification-mark-all-read"
        >
          <Check className="h-4 w-4 mr-2" />
          Gelesen
        </Button>
      </div>
    </div>
  )
}
