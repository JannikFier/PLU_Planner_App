// Obst/Gemüse: Benachrichtigung mit Tabs (Neu / Geändert / Rausgefallen) + Gelesen

import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EyeOff, Check } from 'lucide-react'
import { useNewProducts, useChangedProducts, useMarkNotificationRead } from '@/hooks/useNotifications'
import { useLocation } from 'react-router-dom'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { useHiddenItems, useHideProduct, useUnhideProduct } from '@/hooks/useHiddenItems'
import { useObstOfferCampaignForKwYear } from '@/hooks/useCentralOfferCampaigns'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'
import type { MasterPLUItem } from '@/types/database'
import { useVersions } from '@/hooks/useVersions'
import { getPreviousVersionId } from '@/lib/version-plu-diff'
import { useTransitionRemovedObstItems } from '@/hooks/useTransitionRemovedItems'
import { useStoreListCarryoverRows, useUpsertStoreListCarryover } from '@/hooks/useStoreListCarryover'
import { isCarryoverDecisionBlockedBerlin } from '@/lib/carryover-decision-window'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export interface ObstNotificationPanelProps {
  versionId: string
  /** Hinweisbox (Ausblenden / Gelesen) – nur bei ungelesener Benachrichtigung */
  showInfoHint: boolean
  /** Nach erfolgreichem „Gelesen“ (z. B. Dialog schließen) */
  onAfterMarkRead?: () => void
}

type ObstNotificationTab = 'new' | 'changed' | 'removed'

function ObstNotificationTabbedList({
  defaultTab,
  newProducts,
  changedProducts,
  removedProducts,
  previousVersionId,
  removedLoading,
  renderProductRow,
  renderRemovedRow,
}: {
  defaultTab: ObstNotificationTab
  newProducts: MasterPLUItem[]
  changedProducts: MasterPLUItem[]
  removedProducts: MasterPLUItem[]
  previousVersionId: string | null
  removedLoading: boolean
  renderProductRow: (product: MasterPLUItem, options: { isNew: boolean; showOldPlu?: boolean }) => ReactNode
  renderRemovedRow: (product: MasterPLUItem) => ReactNode
}) {
  const [tab, setTab] = useState<ObstNotificationTab>(defaultTab)
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as ObstNotificationTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto flex-wrap gap-1">
        <TabsTrigger value="new" className="text-xs sm:text-sm">
          Neu <Badge variant="secondary" className="ml-1 tabular-nums">{newProducts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="changed" className="text-xs sm:text-sm">
          Geändert <Badge variant="secondary" className="ml-1 tabular-nums">{changedProducts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="removed" className="text-xs sm:text-sm">
          Raus <Badge variant="secondary" className="ml-1 tabular-nums">{removedProducts.length}</Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="new" className="mt-4 space-y-1.5 min-h-[80px]">
        {newProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine neuen Produkte.</p>
        ) : (
          newProducts.map((p) => renderProductRow(p, { isNew: true }))
        )}
      </TabsContent>
      <TabsContent value="changed" className="mt-4 space-y-1.5 min-h-[80px]">
        {changedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine geänderten PLUs.</p>
        ) : (
          changedProducts.map((p) => renderProductRow(p, { isNew: false, showOldPlu: true }))
        )}
      </TabsContent>
      <TabsContent value="removed" className="mt-4 space-y-3 min-h-[80px]">
        {!previousVersionId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Keine Vorversion zum Vergleichen (erste eingespielte Liste).
          </p>
        ) : removedLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Lade …</p>
        ) : removedProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Keine entfernten PLUs.</p>
        ) : (
          removedProducts.map((p) => renderRemovedRow(p))
        )}
      </TabsContent>
    </Tabs>
  )
}

/**
 * Tabs: Neu, Geändert, Rausgefallen + Fußzeile „Gelesen“.
 */
export function ObstNotificationPanel({
  versionId,
  showInfoHint,
  onAfterMarkRead,
}: ObstNotificationPanelProps) {
  const { pathname } = useLocation()
  const effectiveRole = useEffectiveRouteRole()
  const canHide = canManageMarketHiddenItems(effectiveRole, pathname)
  const canCarryover = canHide

  const { data: versions = [] } = useVersions()
  const notificationVersion = useMemo(
    () => versions.find((v) => v.id === versionId),
    [versions, versionId],
  )
  const previousVersionId = useMemo(
    () => getPreviousVersionId(versions, versionId),
    [versions, versionId],
  )

  const { data: newProducts = [] } = useNewProducts(versionId)
  const { data: changedProducts = [] } = useChangedProducts(versionId)
  const { data: removedProducts = [], isLoading: removedLoading } = useTransitionRemovedObstItems(
    versionId,
    previousVersionId ?? undefined,
  )
  const { data: carryoverRows = [] } = useStoreListCarryoverRows('obst', versionId)

  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    notificationVersion?.kw_nummer,
    notificationVersion?.jahr,
    !!notificationVersion,
  )
  const hideProduct = useHideProduct()
  const unhideProduct = useUnhideProduct()
  const markRead = useMarkNotificationRead()
  const upsertCarryover = useUpsertStoreListCarryover()

  const hiddenPLUs = useMemo(
    () =>
      effectiveHiddenPluSet(new Set(hiddenItems.map((h) => h.plu)), obstCampaign),
    [hiddenItems, obstCampaign],
  )

  const rawHiddenSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])

  const publishedAt = useMemo(
    () => versions.find((v) => v.id === versionId)?.published_at ?? null,
    [versions, versionId],
  )
  const decisionBlocked = isCarryoverDecisionBlockedBerlin(publishedAt)

  const carryByPlu = useMemo(() => new Map(carryoverRows.map((r) => [r.plu, r])), [carryoverRows])

  const defaultTab = useMemo((): ObstNotificationTab => {
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

  const setMarketInclude = async (product: MasterPLUItem, include: boolean) => {
    if (!previousVersionId) return
    try {
      await upsertCarryover.mutateAsync({
        listType: 'obst',
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
          <Badge variant="secondary" className="text-xs shrink-0">
            {product.item_type === 'PIECE' ? 'Stück' : 'Gewicht'}
          </Badge>
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

  const renderRemovedRow = (product: MasterPLUItem) => {
    const row = carryByPlu.get(product.plu)
    const include = row?.market_include ?? false
    const wasHidden = rawHiddenSet.has(product.plu)
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
        {statusLine ? <p className="text-xs text-muted-foreground pl-0">{statusLine}</p> : null}
        {canCarryover ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={include ? 'default' : 'outline'}
              disabled={decisionBlocked || upsertCarryover.isPending}
              onClick={() => void setMarketInclude(product, true)}
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 overflow-y-auto py-1 min-h-[120px]">
        {showInfoHint && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 mb-4 text-xs text-muted-foreground">
            {canHide ? (
              <p>
                <strong>Ausblenden:</strong> Produkt erscheint nicht mehr in PLU-Liste und PDF.
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
            Keine Änderungen gegenüber der Vorversion in dieser KW.
          </p>
        ) : (
          <ObstNotificationTabbedList
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
        <Button onClick={handleMarkRead} disabled={markRead.isPending}>
          <Check className="h-4 w-4 mr-2" />
          Gelesen
        </Button>
      </div>
    </div>
  )
}
