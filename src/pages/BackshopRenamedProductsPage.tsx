// Backshop: Umbenannte Produkte (Admin/Super-Admin), inkl. Bild im Umbenennen-Dialog

import { useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil } from 'lucide-react'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import {
  useBackshopOfferCampaignWithLines,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useResetBackshopProductName, useDeleteBackshopRenamedByPlu } from '@/hooks/useBackshopRename'
import { useAuth } from '@/hooks/useAuth'
import { buildBackshopDisplayList, toBackshopCustomProductInput } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { orderByPluDisplayOrder } from '@/lib/list-order'
import { itemMatchesSearch } from '@/lib/plu-helpers'
import { useListFindInPageSection } from '@/hooks/useListFindInPageSection'
import { ListFindInPageToolbar } from '@/components/plu/ListFindInPageToolbar'
import type { ListFindInPageBinding } from '@/components/plu/list-find-in-page-types'
import {
  RenamedProductsResponsiveList,
  type RenamedProductDisplayRow,
} from '@/components/plu/RenamedProductsResponsiveList'
import type { BackshopMasterPLUItem, BackshopSource } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'

export function BackshopRenamedProductsPage() {
  useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pathPrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'
  const [resetConfirmItem, setResetConfirmItem] = useState<BackshopMasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [], isLoading: itemsLoading } = useBackshopPLUData(activeVersion?.id)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const { data: globalRenamed = [], isLoading: renamedLoading } = useBackshopRenamedItems()
  const { data: backshopCarryoverRows = [] } = useStoreListCarryoverRows('backshop', activeVersion?.id)
  const resetName = useResetBackshopProductName()
  const deleteBackshopRenamedByPlu = useDeleteBackshopRenamedByPlu()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const { lineForceShowKeys, lineForceHideKeys } = useBackshopLineVisibilityOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const { currentStoreId } = useCurrentStore()
  const { data: productGroups = [] } = useBackshopProductGroups()
  const { data: sourceChoices = [] } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)
  const productGroupsForStore = useMemo(
    () => scopeProductGroupsByEffectiveBlock(productGroups, nameBlockOverrides),
    [productGroups, nameBlockOverrides],
  )
  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])
  const {
    productGroupByPluSource,
    chosenSourcesByGroup,
    memberSourcesByGroup,
    productGroupNames,
    groupBlockIdByGroupId,
  } = useMemo(() => {
    const byPluSource = new Map<string, string>()
    const names = new Map<string, string>()
    for (const g of productGroupsForStore) {
      names.set(g.id, g.display_name)
      for (const mm of g.members) {
        byPluSource.set(`${mm.plu}|${mm.source}`, g.id)
      }
    }
    const chosen = new Map<string, BackshopSource[]>()
    for (const c of sourceChoices) {
      chosen.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
    }
    const memberSourcesByG = new Map<string, Set<BackshopSource>>()
    const groupBlock = new Map<string, string | null>()
    for (const g of productGroupsForStore) {
      const s = new Set<BackshopSource>()
      for (const mem of g.members) s.add(mem.source as BackshopSource)
      memberSourcesByG.set(g.id, s)
      groupBlock.set(g.id, g.block_id ?? null)
    }
    return {
      productGroupByPluSource: byPluSource,
      chosenSourcesByGroup: chosen,
      memberSourcesByGroup: memberSourcesByG,
      productGroupNames: names,
      groupBlockIdByGroupId: groupBlock,
    }
  }, [productGroupsForStore, sourceChoices])

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
      customProducts: customProducts.map(toBackshopCustomProductInput),
      bezeichnungsregeln: activeRegeln,
      renamedItems: globalRenamed,
      markYellowKwCount: markYellow,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup,
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
      lineForceShowKeys,
      lineForceHideKeys,
    })
    return items.map((i) => i.plu)
  }, [
    masterItems,
    customProducts,
    offerDisplayByPlu,
    regeln,
    blocks,
    layoutSettings,
    globalRenamed,
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    chosenSourcesByGroup,
    productGroupNames,
    blockPreferredSourceByBlockId,
    groupBlockIdByGroupId,
    lineForceShowKeys,
    lineForceHideKeys,
  ])

  const carryoverMastersIncluded = useMemo(() => {
    if (!activeVersion?.id) return [] as BackshopMasterPLUItem[]
    return backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, activeVersion.id))
  }, [backshopCarryoverRows, activeVersion?.id])

  const masterByPluForRenamed = useMemo(() => {
    const m = new Map<string, BackshopMasterPLUItem>()
    for (const item of masterItems) m.set(item.plu, item)
    for (const c of carryoverMastersIncluded) {
      if (!m.has(c.plu)) m.set(c.plu, c)
    }
    return m
  }, [masterItems, carryoverMastersIncluded])

  // Global umbenannt: Master ODER Carryover-Zeile
  const renamedItems = useMemo(() => {
    const out: BackshopMasterPLUItem[] = []
    for (const r of globalRenamed) {
      const base = masterByPluForRenamed.get(r.plu)
      if (!base) continue
      out.push({ ...base, display_name: r.display_name })
    }
    return out
  }, [globalRenamed, masterByPluForRenamed])

  const sortedRenamedItems = useMemo(
    () => orderByPluDisplayOrder(renamedItems, (x) => x.plu, canonicalListOrderPlu),
    [renamedItems, canonicalListOrderPlu],
  )

  const renamedListRows: RenamedProductDisplayRow[] = useMemo(
    () =>
      sortedRenamedItems.map((item) => {
        const r = globalRenamed.find((g) => g.plu === item.plu)
        const thumb = (r?.image_url ?? item.image_url) || null
        return {
          plu: item.plu,
          systemName: item.system_name,
          currentName: item.display_name ?? item.system_name,
          thumbUrl: thumb,
          onReset: () => setResetConfirmItem(item),
        }
      }),
    [sortedRenamedItems, globalRenamed],
  )

  const matchRenamedRowForFind = useCallback((row: RenamedProductDisplayRow, q: string) => {
    return itemMatchesSearch(
      { plu: row.plu, display_name: row.currentName, system_name: row.systemName },
      q,
    )
  }, [])

  const renamedListFind = useListFindInPageSection({
    items: renamedListRows,
    scopeId: 'renamed-products-backshop-page',
    isMatch: matchRenamedRowForFind,
  })

  const renamedFindInPageBinding = useMemo((): ListFindInPageBinding | undefined => {
    if (renamedListRows.length === 0) return undefined
    return {
      scopeId: 'renamed-products-backshop-page',
      activeRowIndex: renamedListFind.activeRowIndex,
      matchIndices: renamedListFind.matchIndices,
    }
  }, [renamedListRows.length, renamedListFind.activeRowIndex, renamedListFind.matchIndices])

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    const systemName = resetConfirmItem.system_name?.trim()
    if (!systemName) return
    try {
      if (resetConfirmItem.id.startsWith('carryover-')) {
        await deleteBackshopRenamedByPlu.mutateAsync({ plu: resetConfirmItem.plu })
      } else {
        await resetName.mutateAsync({
          item_id: resetConfirmItem.id,
          system_name: systemName,
        })
      }
      setResetConfirmItem(null)
    } catch {
      // Toast im Hook
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="backshop-renamed-page">
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          data-tour="backshop-renamed-toolbar"
        >
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 bg-muted">
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Umbenannte Produkte (Backshop)</h2>
                <p className="text-sm text-muted-foreground">
                  Anzeigenamen und optional Bilder anpassen oder auf das Original zurücksetzen.
                </p>
              </div>
            </div>
            {!itemsLoading && !renamedLoading && renamedListRows.length > 0 && (
              <ListFindInPageToolbar
                showBar={renamedListFind.showBar}
                onOpen={renamedListFind.openSearch}
                barProps={renamedListFind.findInPageBarProps}
                dataTour="backshop-renamed-search"
              />
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              navigate(`${pathPrefix}/pick-rename-backshop`, {
                state: { backTo: `${location.pathname}${location.search ?? ''}` },
              })
            }
            data-tour="backshop-renamed-add-button"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Produkte umbenennen
          </Button>
        </div>

        {(itemsLoading || renamedLoading) && (
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

        {!itemsLoading && !renamedLoading && sortedRenamedItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Pencil className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine umbenannten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Klicke auf „Produkte umbenennen“, um Anzeigenamen und optional Bilder in der Backshop-Liste zu ändern.
              </p>
            </CardContent>
          </Card>
        )}

        {!itemsLoading && !renamedLoading && sortedRenamedItems.length > 0 && (
          <Card data-tour="backshop-renamed-list">
            <CardContent className="p-0">
              <RenamedProductsResponsiveList
                variant="backshop"
                resetPending={resetName.isPending || deleteBackshopRenamedByPlu.isPending}
                rows={renamedListRows}
                findInPage={renamedFindInPageBinding}
                firstItemDataTour="backshop-renamed-first-item"
                firstResetButtonDataTour="backshop-renamed-reset-button"
              />
            </CardContent>
          </Card>
        )}

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Aus Liste entfernen?'
                  : 'Produktnamen zurücksetzen?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Das Produkt wird aus der Liste „Umbenannte Produkte“ entfernt (nur die Einstellung „umbenannt“ wird zurückgesetzt). Name und Bild bleiben unverändert.'
                  : `Der Anzeigename wird wieder auf „${resetConfirmItem?.system_name}“ gesetzt. Das Bild bleibt unverändert.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetConfirm}
                disabled={resetName.isPending || deleteBackshopRenamedByPlu.isPending}
              >
                {resetName.isPending || deleteBackshopRenamedByPlu.isPending
                  ? 'Wird zurückgesetzt…'
                  : 'Zurücksetzen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
