// Vollseite: Produkte ausblenden (Backshop) – inkl. Bild und Marken-Kürzel (E/H/A)
// Nur Zeilen, die in der effektiven Backshop-Anzeigeliste vorkommen (gleiche Engine wie Masterliste).

import { useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  HideBackshopPickerContent,
  type HideBackshopPickerRow,
} from '@/components/plu/HideBackshopPickerContent'
import { resolvePickerBackTarget } from '@/lib/picker-back-navigation'
import { useBackshopHiddenItems } from '@/hooks/useBackshopHiddenItems'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import type { Block } from '@/types/database'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import {
  useBackshopOfferCampaignWithPreview,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import { getBackshopRuleFilteredMasterRows } from '@/lib/backshop-visibility-diff'
import { buildBackshopDisplayListInputFromSnapshot } from '@/lib/backshop-display-list-input-build'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import type { BackshopSource } from '@/types/database'

export function PickHideBackshopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location
  const effectiveRole = useEffectiveRouteRole()
  const canManageHidden = canManageMarketHiddenItems(effectiveRole, pathname)
  const { currentStoreId } = useCurrentStore()

  const backPath = useMemo(
    () => resolvePickerBackTarget(pathname, location.state) ?? '/user/backshop-hidden-products',
    [pathname, location.state],
  )

  const { lineForceShowKeys, lineForceHideKeys } = useBackshopLineVisibilityOverrides()

  const { data: hiddenItems = [], isLoading: hiddenLoading } = useBackshopHiddenItems()
  const { data: activeVersion, isLoading: activeVersionLoading } = useActiveBackshopVersion()
  const versionId = activeVersion?.id
  const { data: masterItems = [], isLoading: masterItemsLoading } = useBackshopPLUData(versionId)
  const { data: backshopCarryoverRows = [] } = useStoreListCarryoverRows('backshop', versionId)
  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const { data: regeln = [] } = useBackshopBezeichnungsregeln()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const offerPreview = useMemo(() => ({ mode: 'auto' } as const), [])
  const { data: backshopCampaign } = useBackshopOfferCampaignWithPreview(offerPreview)
  const { data: backshopStoreDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const { data: productGroups = [] } = useBackshopProductGroups()
  const { data: sourceChoices = [] } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)

  const { data: backshopPrevManualPluSetData, isSuccess: backshopPrevManualLoaded } =
    useBackshopPrevManualSupplementPluSet(versionId)
  const backshopPrevManualPluSetForLayout = backshopPrevManualLoaded
    ? (backshopPrevManualPluSetData ?? null)
    : undefined
  const prevManualReady = !versionId || backshopPrevManualLoaded

  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const productGroupsForStore = useMemo(
    () => scopeProductGroupsByEffectiveBlock(productGroups, nameBlockOverrides),
    [productGroups, nameBlockOverrides],
  )

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const offerKw = activeVersion ? activeVersion.kw_nummer : calendarKw
  const offerJahr = activeVersion ? activeVersion.jahr : calendarJahr

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        offerKw,
        offerJahr,
        backshopCampaign ?? null,
        backshopStoreDisabled,
        offerItems,
        backshopLocalOverrides,
      ),
    [offerKw, offerJahr, backshopCampaign, backshopStoreDisabled, offerItems, backshopLocalOverrides],
  )

  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])

  const { productGroupByPluSource, chosenSourcesByGroup, productGroupNames, memberSourcesByGroup } =
    useMemo(() => {
      const byPluSource = new Map<string, string>()
      const names = new Map<string, string>()
      for (const g of productGroupsForStore) {
        names.set(g.id, g.display_name)
        for (const m of g.members) {
          byPluSource.set(`${m.plu}|${m.source}`, g.id)
        }
      }
      const chosen = new Map<string, BackshopSource[]>()
      for (const c of sourceChoices) {
        chosen.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
      }
      const memberSourcesByG = new Map<string, Set<BackshopSource>>()
      for (const g of productGroupsForStore) {
        const s = new Set<BackshopSource>()
        for (const mem of g.members) s.add(mem.source as BackshopSource)
        memberSourcesByG.set(g.id, s)
      }
      return {
        productGroupByPluSource: byPluSource,
        chosenSourcesByGroup: chosen,
        productGroupNames: names,
        memberSourcesByGroup: memberSourcesByG,
      }
    }, [productGroupsForStore, sourceChoices])

  const groupBlockIdByGroupId = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const g of productGroupsForStore) m.set(g.id, g.block_id ?? null)
    return m
  }, [productGroupsForStore])

  const rawHiddenPluSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign, backshopStoreDisabled),
    [rawHiddenPluSet, backshopCampaign, backshopStoreDisabled],
  )

  const markYellow = layoutSettings?.mark_yellow_kw_count ?? 4
  const sortMode = (layoutSettings?.sort_mode ?? 'ALPHABETICAL') as 'ALPHABETICAL' | 'BY_BLOCK'

  const displayListInput = useMemo(() => {
    if (!versionId || !activeVersion) return null
    const carryoverMaster = backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, activeVersion.id))
    return buildBackshopDisplayListInputFromSnapshot({
      versionId,
      masterItems,
      carryoverMasterItems: carryoverMaster,
      effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks: blocks as Block[],
      customProducts,
      bezeichnungsregeln: regeln,
      renamedItems,
      markYellowKwCount: markYellow,
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup,
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
      backshopPrevManualPluSet: backshopPrevManualPluSetForLayout,
      lineForceShowKeys,
      lineForceHideKeys,
    })
  }, [
    versionId,
    activeVersion,
    backshopCarryoverRows,
    masterItems,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    regeln,
    renamedItems,
    markYellow,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    chosenSourcesByGroup,
    productGroupNames,
    blockPreferredSourceByBlockId,
    groupBlockIdByGroupId,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeys,
    lineForceHideKeys,
  ])

  const renamedByPlu = useMemo(() => new Map(renamedItems.map((r) => [r.plu, r])), [renamedItems])

  const hidePickerRows = useMemo((): HideBackshopPickerRow[] => {
    if (!displayListInput) return []
    const { visiblePluSourceKeys, visibleCustomPluSet } = getBackshopRuleFilteredMasterRows(
      displayListInput,
      rawHiddenPluSet,
    )
    const master = masterItems
      .filter((m) => {
        if (rawHiddenPluSet.has(m.plu)) return false
        const src = (m.source ?? 'edeka') as BackshopSource
        return visiblePluSourceKeys.has(`${m.plu}|${src}`)
      })
      .map((m) => {
        const r = renamedByPlu.get(m.plu)
        return {
          id: m.id,
          plu: m.plu,
          display_name: r?.display_name ?? m.display_name ?? m.system_name,
          system_name: m.system_name,
          item_type: 'PIECE' as const,
          block_id: m.block_id,
          image_url: m.image_url,
          source: m.source,
          is_market_custom: false,
        }
      })
    const custom = customProducts
      .filter((c) => !rawHiddenPluSet.has(c.plu) && visibleCustomPluSet.has(c.plu))
      .map(
        (c): HideBackshopPickerRow => ({
          id: c.id,
          plu: c.plu,
          display_name: c.name,
          system_name: c.name,
          item_type: 'PIECE' as const,
          block_id: c.block_id,
          image_url: c.image_url,
          source: undefined,
          is_market_custom: true,
        }),
      )
    return [...master, ...custom]
  }, [displayListInput, masterItems, customProducts, rawHiddenPluSet, renamedByPlu])

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

  const isLoading =
    hiddenLoading || masterItemsLoading || activeVersionLoading || !prevManualReady

  if (!canManageHidden) {
    return <Navigate to={backPath} replace />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-muted h-64 rounded-lg max-w-7xl mx-auto" />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 max-w-[1600px] mx-auto min-w-0">
        <HideBackshopPickerContent
          searchableItems={hidePickerRows}
          displayMode={displayMode}
          listLayout={hideDialogListLayout}
          onCancel={() => navigate(backPath)}
          onAfterBatchSuccess={() => navigate(backPath, { replace: true })}
        />
      </div>
    </DashboardLayout>
  )
}
