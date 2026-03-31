// Backshop: Ausgeblendete Produkte – Liste, Einblenden, „Produkte ausblenden“

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EyeOff, Undo2, Pencil } from 'lucide-react'
import { useBackshopHiddenItems, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import {
  useBackshopOfferCampaignWithLines,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useAuth } from '@/hooks/useAuth'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { useQuery } from '@tanstack/react-query'
import { HideBackshopProductsDialog } from '@/components/plu/HideBackshopProductsDialog'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { EditBackshopCustomProductDialog } from '@/components/plu/EditBackshopCustomProductDialog'
import type { BackshopCustomProduct, Block } from '@/types/database'
import type { Profile } from '@/types/database'

interface HiddenProductInfo {
  plu: string
  name: string
  source: 'master' | 'custom' | 'unknown'
  customProduct: BackshopCustomProduct | null
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
  thumbUrl: string | null
}

export function BackshopHiddenProductsPage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)

  const [showHideDialog, setShowHideDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BackshopCustomProduct | null>(null)

  const { data: hiddenItems = [], isLoading: hiddenLoading } = useBackshopHiddenItems()
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const unhideProduct = useBackshopUnhideProduct()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )
  const hideDialogListLayout = useMemo(
    () => ({
      sortMode: (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK',
      blocks: blocks as Block[],
      storeBlockOrder: storeBackshopBlockOrder,
      nameBlockOverrides,
    }),
    [layoutSettings?.sort_mode, blocks, storeBackshopBlockOrder, nameBlockOverrides],
  )
  const displayMode = (layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        currentKw,
        currentJahr,
        backshopCampaign ?? null,
        backshopStoreDisabled,
        offerItems,
        backshopLocalOverrides,
      ),
    [currentKw, currentJahr, backshopCampaign, backshopStoreDisabled, offerItems, backshopLocalOverrides],
  )

  const renamedByPlu = useMemo(() => new Map(renamedItems.map((r) => [r.plu, r])), [renamedItems])

  const hiddenPLUSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])

  const searchableItems = useMemo(() => {
    const master = masterItems
      .filter((m) => !hiddenPLUSet.has(m.plu))
      .map((m) => {
        const r = renamedByPlu.get(m.plu)
        return {
          id: m.id,
          plu: m.plu,
          display_name: r?.display_name ?? m.display_name ?? m.system_name,
          system_name: m.system_name,
          item_type: 'PIECE' as const,
          block_id: m.block_id,
        }
      })
    const custom = customProducts
      .filter((c) => !hiddenPLUSet.has(c.plu))
      .map((c) => ({
        id: c.id,
        plu: c.plu,
        display_name: c.name,
        system_name: c.name,
        item_type: 'PIECE' as const,
        block_id: c.block_id,
      }))
    return [...master, ...custom]
  }, [masterItems, customProducts, hiddenPLUSet, renamedByPlu])

  const canonicalListOrderPlu = useMemo(() => {
    const activeRegeln = regeln.filter((r) => r.is_active)
    const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
    const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
    const { items } = buildBackshopDisplayList({
      masterItems,
      hiddenPLUs: new Set(),
      offerDisplayByPlu,
      sortMode,
      blocks,
      customProducts: customProducts.map((c) => ({
        id: c.id,
        plu: c.plu,
        name: c.name,
        image_url: c.image_url,
        block_id: c.block_id,
        created_at: c.created_at,
      })),
      bezeichnungsregeln: activeRegeln,
      renamedItems,
      markYellowKwCount: markYellow,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
    })
    return items.map((i) => i.plu)
  }, [
    masterItems,
    customProducts,
    offerDisplayByPlu,
    regeln,
    blocks,
    layoutSettings,
    renamedItems,
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
  ])

  const hiddenByIds = useMemo(() => [...new Set(hiddenItems.map((h) => h.hidden_by))], [hiddenItems])

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-hidden-by', hiddenByIds],
    queryFn: async () => {
      if (hiddenByIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, personalnummer')
        .in('id', hiddenByIds)
      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'display_name' | 'personalnummer'>[]
    },
    enabled: hiddenByIds.length > 0,
  })

  const profileMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) {
      map.set(p.id, p.display_name ?? p.personalnummer)
    }
    return map
  }, [profiles])

  const hiddenProductInfos: HiddenProductInfo[] = useMemo(() => {
    return hiddenItems.map((hidden) => {
      const masterItem = masterItems.find((m) => m.plu === hidden.plu)
      if (masterItem) {
        const r = renamedByPlu.get(hidden.plu)
        const thumbUrl = (r?.image_url ?? masterItem.image_url) || null
        return {
          plu: hidden.plu,
          name: masterItem.display_name ?? masterItem.system_name,
          source: 'master' as const,
          customProduct: null,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
          thumbUrl,
        }
      }
      const customItem = customProducts.find((c) => c.plu === hidden.plu)
      if (customItem) {
        return {
          plu: hidden.plu,
          name: customItem.name,
          source: 'custom' as const,
          customProduct: customItem,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
          thumbUrl: customItem.image_url || null,
        }
      }
      return {
        plu: hidden.plu,
        name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
        source: 'unknown' as const,
        customProduct: null,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
        thumbUrl: null,
      }
    })
  }, [hiddenItems, masterItems, customProducts, profileMap, renamedByPlu])

  const sortedHiddenProductInfos = useMemo(
    () => orderByPluDisplayOrder(hiddenProductInfos, (x) => x.plu, canonicalListOrderPlu),
    [hiddenProductInfos, canonicalListOrderPlu],
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ausgeblendete Produkte (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Produkte einblenden oder weitere ausblenden.
              </p>
            </div>
          </div>

          {canManageHidden && (
            <Button variant="outline" size="sm" onClick={() => setShowHideDialog(true)}>
              <EyeOff className="h-4 w-4 mr-2" />
              Produkte ausblenden
            </Button>
          )}
        </div>

        {hiddenLoading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && hiddenItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <EyeOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine ausgeblendeten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Du hast noch keine Backshop-Produkte ausgeblendet. Klicke auf „Produkte ausblenden“, um Produkte aus der Backshop-Liste auszublenden.
              </p>
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && sortedHiddenProductInfos.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 w-14 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" aria-label="Bild" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Artikel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">Ausgeblendet von</th>
                    <th className="px-4 py-3 text-right w-[180px]" />
                  </tr>
                </thead>
                <tbody>
                  {sortedHiddenProductInfos.map((info) => (
                    <tr key={info.plu} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 w-14 align-middle">
                        <BackshopThumbnail src={info.thumbUrl} size="md" />
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(info.plu)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          {info.name}
                          {info.source === 'custom' && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Eigen</Badge>
                          )}
                          {info.source === 'unknown' && (
                            <Badge variant="secondary" className="text-xs">Unbekannt</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          {info.hiddenByName}
                          {user && info.hidden_by === user.id && (
                            <Badge variant="secondary" className="text-xs shrink-0">Von mir</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {info.customProduct && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { if (info.customProduct) setEditingProduct(info.customProduct) }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Bearbeiten
                            </Button>
                          )}
                          {canManageHidden ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => unhideProduct.mutate(info.plu)}
                              disabled={unhideProduct.isPending}
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
            </CardContent>
          </Card>
        )}

        {canManageHidden && (
          <HideBackshopProductsDialog
            open={showHideDialog}
            onOpenChange={setShowHideDialog}
            searchableItems={searchableItems}
            displayMode={displayMode}
            listLayout={hideDialogListLayout}
          />
        )}

        {editingProduct && (
          <EditBackshopCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={blocks}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
