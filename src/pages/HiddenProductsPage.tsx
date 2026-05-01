// HiddenProductsPage – Ausgeblendete Produkte (dedizierte Seite)
// Liste, Einblenden, Bearbeiten (bei eigenen), "Produkte ausblenden" oben rechts

import { useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EyeOff } from 'lucide-react'
import { useHiddenItems, useUnhideProduct } from '@/hooks/useHiddenItems'
import { useOfferItems } from '@/hooks/useOfferItems'
import {
  useObstOfferCampaignForKwYear,
  useObstOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useObstOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { useRenamedItems } from '@/hooks/useRenamedItems'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useBlocks } from '@/hooks/useBlocks'
import { useAuth } from '@/hooks/useAuth'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { getDisplayPlu, itemMatchesSearch } from '@/lib/plu-helpers'
import { useListFindInPageSection } from '@/hooks/useListFindInPageSection'
import { ListFindInPageToolbar } from '@/components/plu/ListFindInPageToolbar'
import type { ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import { buildDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { useQuery } from '@tanstack/react-query'
import { EditCustomProductDialog } from '@/components/plu/EditCustomProductDialog'
import {
  HiddenProductsResponsiveList,
  type HiddenProductDisplayRow,
} from '@/components/plu/HiddenProductsResponsiveList'
import type { Profile } from '@/types/database'
import type { CustomProduct } from '@/types/database'

interface HiddenProductInfo {
  plu: string
  name: string
  itemType: 'PIECE' | 'WEIGHT' | null
  source: 'master' | 'custom' | 'unknown'
  customProduct: CustomProduct | null
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
}

export function HiddenProductsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const { user } = useAuth()
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)
  const currentUserId = user?.id ?? null

  const pathPrefix =
    pathname.startsWith('/super-admin') ? '/super-admin'
    : pathname.startsWith('/admin') ? '/admin'
    : '/user'

  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null)

  const { data: hiddenItems = [], isLoading: hiddenLoading, isError: hiddenError } = useHiddenItems()
  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [] } = useCustomProducts()
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )
  const { data: renamedItems = [] } = useRenamedItems()
  const { data: offerItems = [] } = useOfferItems()
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    activeVersion?.kw_nummer,
    activeVersion?.jahr,
    !!activeVersion,
  )
  const { data: obstStoreDisabled = new Set() } = useObstOfferStoreDisabled()
  const { overrideMap: obstLocalOverrides } = useObstOfferLocalPriceOverrides(obstCampaign ?? undefined)
  const unhideProduct = useUnhideProduct()

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const offerMapKw = activeVersion?.kw_nummer ?? calendarKw
  const offerMapJahr = activeVersion?.jahr ?? calendarJahr
  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        offerMapKw,
        offerMapJahr,
        obstCampaign ?? null,
        obstStoreDisabled,
        offerItems,
        obstLocalOverrides,
      ),
    [offerMapKw, offerMapJahr, obstCampaign, obstStoreDisabled, offerItems, obstLocalOverrides],
  )

  const centralCampaignPluSet = useMemo(() => {
    if (obstCampaign?.allCentralPluUnion?.length) return new Set(obstCampaign.allCentralPluUnion)
    return new Set((obstCampaign?.lines ?? []).map((l) => l.plu))
  }, [obstCampaign])

  const canonicalListOrderPlu = useMemo(() => {
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({
        keyword: r.keyword,
        position: r.position,
        case_sensitive: r.case_sensitive,
      }))
    const version = activeVersion
    const now = new Date()
    const { items } = buildDisplayList({
      masterItems,
      customProducts,
      hiddenPLUs: new Set(),
      offerDisplayByPlu,
      renamedItems: renamedItems.map((r) => ({
        plu: r.plu,
        display_name: r.display_name,
        is_manually_renamed: r.is_manually_renamed,
      })),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode: layoutSettings?.sort_mode ?? 'ALPHABETICAL',
      displayMode: layoutSettings?.display_mode ?? 'MIXED',
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: version?.kw_nummer ?? 0,
      versionJahr: version?.jahr ?? now.getFullYear(),
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
    })
    return items.map((i) => i.plu)
  }, [
    masterItems,
    customProducts,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    activeVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
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
        return {
          plu: hidden.plu,
          name: masterItem.display_name ?? masterItem.system_name,
          itemType: masterItem.item_type,
          source: 'master' as const,
          customProduct: null,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }

      const customItem = customProducts.find((c) => c.plu === hidden.plu)
      if (customItem) {
        return {
          plu: hidden.plu,
          name: customItem.name,
          itemType: customItem.item_type,
          source: 'custom' as const,
          customProduct: customItem,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }

      return {
        plu: hidden.plu,
        name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
        itemType: null,
        source: 'unknown' as const,
        customProduct: null,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
      }
    })
  }, [hiddenItems, masterItems, customProducts, profileMap])

  const sortedHiddenProductInfos = useMemo(
    () => orderByPluDisplayOrder(hiddenProductInfos, (x) => x.plu, canonicalListOrderPlu),
    [hiddenProductInfos, canonicalListOrderPlu],
  )

  const hiddenListRows: HiddenProductDisplayRow[] = useMemo(
    () =>
      sortedHiddenProductInfos.map((info) => ({
        plu: info.plu,
        name: info.name,
        hiddenByName: info.hiddenByName,
        hidden_by: info.hidden_by,
        showVonMirBadge: Boolean(currentUserId && info.hidden_by === currentUserId),
        source: info.source,
        showCentralCampaignBadge: centralCampaignPluSet.has(info.plu),
        typLabel:
          info.itemType === 'PIECE' ? 'Stück' : info.itemType === 'WEIGHT' ? 'Gewicht' : '–',
        thumbUrl: null,
        onEdit: info.customProduct
          ? () => {
              if (info.customProduct) setEditingProduct(info.customProduct)
            }
          : undefined,
      })),
    [sortedHiddenProductInfos, currentUserId, centralCampaignPluSet],
  )

  const matchHiddenRowForFind = useCallback((row: HiddenProductDisplayRow, q: string) => {
    const s = q.trim().toLowerCase()
    if (!s) return false
    return (
      itemMatchesSearch({ plu: row.plu, display_name: row.name, system_name: row.name }, q) ||
      row.hiddenByName.toLowerCase().includes(s)
    )
  }, [])

  const hiddenListFind = useListFindInPageSection({
    items: hiddenListRows,
    scopeId: 'hidden-products-obst-page',
    isMatch: matchHiddenRowForFind,
  })

  const hiddenFindInPageBinding = useMemo((): ListFindInPageBinding | undefined => {
    if (hiddenListRows.length === 0) return undefined
    return {
      scopeId: 'hidden-products-obst-page',
      activeRowIndex: hiddenListFind.activeRowIndex,
      matchIndices: hiddenListFind.matchIndices,
    }
  }, [hiddenListRows.length, hiddenListFind.activeRowIndex, hiddenListFind.matchIndices])

  if (hiddenError) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Fehler beim Laden der Daten</p>
            <p className="text-sm mt-1">Bitte lade die Seite neu oder versuche es später erneut.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          data-tour="obst-hidden-toolbar"
        >
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-muted">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Ausgeblendete Produkte</h2>
                <p className="text-sm text-muted-foreground">
                  Produkte einblenden oder weitere ausblenden. Steht eine PLU in der zentralen Werbung, kann sie
                  in der Hauptliste trotzdem sichtbar sein (Badge in der Tabelle).
                </p>
              </div>
            </div>
            {!hiddenLoading && hiddenListRows.length > 0 && (
              <ListFindInPageToolbar
                showBar={hiddenListFind.showBar}
                onOpen={hiddenListFind.openSearch}
                barProps={hiddenListFind.findInPageBarProps}
                dataTour="obst-hidden-search"
              />
            )}
          </div>

          {canManageHidden && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`${pathPrefix}/pick-hide-obst`, {
                  state: { backTo: `${pathname}${location.search ?? ''}` },
                })
              }
              data-tour="obst-hidden-add-button"
            >
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
                Du hast noch keine Produkte ausgeblendet. Klicke oben rechts auf „Produkte ausblenden“, um Produkte aus der PLU-Liste auszublenden.
              </p>
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && sortedHiddenProductInfos.length > 0 && (
          <Card data-tour="obst-hidden-list">
            <CardContent className="p-0">
              <HiddenProductsResponsiveList
                variant="obst"
                canManageHidden={canManageHidden}
                unhidePending={unhideProduct.isPending}
                onUnhide={(plu) => unhideProduct.mutate(plu)}
                rows={hiddenListRows}
                findInPage={hiddenFindInPageBinding}
                firstItemDataTour="obst-hidden-first-item"
                firstShowButtonDataTour="obst-hidden-show-button"
              />
            </CardContent>
          </Card>
        )}

        {editingProduct && (
          <EditCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={blocks}
            dataTour="obst-hidden-edit-dialog"
            submitDataTour="obst-hidden-edit-dialog-submit"
          />
        )}
      </div>
    </DashboardLayout>
  )
}
