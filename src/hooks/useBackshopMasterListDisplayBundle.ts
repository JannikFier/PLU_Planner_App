/**
 * Gemeinsame Datenkette für Backshop-Masterliste und Kachel-Katalog:
 * Version, Masterzeilen, Layout-Engine → displayItems + Kontext für PDF/Strichcode.
 */

import { useMemo } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopHiddenItems } from '@/hooks/useBackshopHiddenItems'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import { compareIsoWeekPair, getBackshopWerbungKwYearFromDate } from '@/lib/date-kw-utils'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import {
  useBackshopOfferCampaignSlots,
  useBackshopOfferCampaignWithPreview,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type {
  BackshopSource,
  BackshopMasterPLUItem,
  BackshopVersion,
  BackshopBezeichnungsregel,
  BackshopRenamedItem,
  Block,
  StoreBackshopBlockOrder,
} from '@/types/database'
import type { OfferDisplayInfo } from '@/lib/offer-display'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import { BACKSHOP_SOURCES, type BackshopExcelSource } from '@/lib/backshop-sources'
import { useBackshopOfferPreviewUi } from '@/hooks/useBackshopOfferPreviewUi'
import { useBackshopMasterListDisplayList } from '@/hooks/useBackshopMasterListDisplayList'
import type { DisplayItem } from '@/types/plu'
import type { PLUStats } from '@/lib/plu-helpers'

/** Runtime kann GTIN liefern, auch wenn generated Types noch ohne Spalte sind. */
type MasterPluRowWithArtNr = BackshopMasterPLUItem & { source_art_nr?: string | null }

/** GTIN/Art.-Nr. pro PLU (Carryover überschreibt Master bei gleicher PLU). */
function buildSourceArtNrByPlu(
  masterScopeItems: BackshopMasterPLUItem[],
  carryoverMasterScoped: BackshopMasterPLUItem[],
): Map<string, string> {
  const m = new Map<string, string>()
  for (const item of masterScopeItems) {
    const raw = (item as MasterPluRowWithArtNr).source_art_nr?.trim()
    if (raw) m.set(item.plu, raw)
  }
  for (const item of carryoverMasterScoped) {
    const raw = (item as MasterPluRowWithArtNr).source_art_nr?.trim()
    if (raw) m.set(item.plu, raw)
  }
  return m
}

export interface BackshopMasterListDisplayBundle {
  isSnapshot: boolean
  snapshotInvalid: boolean
  snapshotReadOnly: boolean
  snapshotSourceOnly: BackshopExcelSource | null
  setSearchParams: ReturnType<typeof useSearchParams>[1]
  resolvedBackshopVersion: BackshopVersion | undefined
  effectiveVersionId: string | undefined
  listVersion: BackshopVersion | null | undefined
  activeVersion: BackshopVersion | null | undefined
  versionLoading: boolean
  itemsLoading: boolean
  itemsRefetching: boolean
  itemsError: unknown
  refetchItems: () => void
  isLoading: boolean
  hasNoVersion: boolean
  rawItems: BackshopMasterPLUItem[]
  masterScopeItems: BackshopMasterPLUItem[]
  carryoverMasterScoped: BackshopMasterPLUItem[]
  displayItems: DisplayItem[]
  stats: PLUStats
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  /** Anzeige der PLU-Tabelle: zusammen vs. Stück/Gewicht getrennt (Backshop: nur alphabetisch vs. Warengruppen). */
  displayMode: 'MIXED' | 'SEPARATED'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  fontSizes: { header: number; column: number; product: number }
  blocks: Block[]
  customProducts: import('@/types/database').BackshopCustomProduct[]
  storeBackshopNameOverrides: import('@/types/database').StoreBackshopNameBlockOverride[]
  /** KW-Slots nach vorn (Toolbar-Dropdown) */
  forwardWerbungSlots: Array<{ kw: number; jahr: number }>
  offerPreviewSelectValue: string
  onOfferPreviewChange: (v: string) => void
  calendarKw: number
  calendarJahr: number
  effectiveWerbungEndKw: number
  effectiveWerbungEndJahr: number
  markYellowKwCount: number
  showWeekMonSat: boolean
  isSuperAdminCentralBackshopMasterView: boolean
  /** GTIN/Art.-Nr. für Strichcode-Kacheln */
  sourceArtNrByPlu: Map<string, string>
  /** Für PDF-Export-Hook (gleiche Engine-Parameter wie displayItems) */
  bezeichnungsregeln: BackshopBezeichnungsregel[]
  renamedItems: BackshopRenamedItem[]
  effectiveHiddenPLUs: Set<string>
  offerDisplayByPlu: Map<string, OfferDisplayInfo>
  nameBlockOverrides: Map<string, string>
  storeBackshopBlockOrder: StoreBackshopBlockOrder[]
  productGroupByPluSource: Map<string, string>
  memberSourcesByGroup: Map<string, Set<BackshopSource>>
  layoutChosenSourcesForList: Map<string, BackshopSource[]>
  productGroupNames: Map<string, string>
  layoutBlockPreferredForList: Map<string, BackshopSource>
  layoutGroupBlockIdByGroupIdForList: Map<string, string | null>
  backshopPrevManualPluSetForLayout: Set<string> | null | undefined
  lineForceShowKeysForList: Set<string>
  lineForceHideKeysForList: Set<string>
}

export function useBackshopMasterListDisplayBundle(): BackshopMasterListDisplayBundle {
  const location = useLocation()
  const { versionId: snapshotVersionId } = useParams<{ versionId?: string }>()
  const isSnapshot = Boolean(snapshotVersionId)
  const { isSuperAdmin } = useAuth()

  const isSuperAdminCentralBackshopMasterView = useMemo(() => {
    if (!isSuperAdmin) return false
    const p = location.pathname
    if (p !== '/super-admin/backshop-list' && !p.startsWith('/super-admin/backshop-list/version/')) {
      return false
    }
    const qBt = new URLSearchParams(location.search).get('backTo') ?? ''
    const stBt = (location.state as { backTo?: string } | null)?.backTo ?? ''
    const fromStore = (s: string) =>
      s.includes('/super-admin/companies/') && s.includes('/stores/')
    return !fromStore(qBt) && !fromStore(stBt)
  }, [isSuperAdmin, location.pathname, location.search, location.state])

  const { data: activeVersion, isLoading: activeVersionLoading } = useActiveBackshopVersion()
  const { data: allBackshopVersions = [], isLoading: backshopVersionsLoading } = useBackshopVersions()
  const { data: layoutSettings } = useBackshopLayoutSettings()

  const resolvedBackshopVersion = useMemo(
    () =>
      snapshotVersionId
        ? allBackshopVersions.find((v) => v.id === snapshotVersionId)
        : undefined,
    [allBackshopVersions, snapshotVersionId],
  )
  const snapshotInvalid = isSnapshot && !backshopVersionsLoading && !resolvedBackshopVersion

  const effectiveVersionId = snapshotInvalid
    ? undefined
    : isSnapshot
      ? snapshotVersionId
      : activeVersion?.id

  const listVersion = isSnapshot ? resolvedBackshopVersion : (resolvedBackshopVersion ?? activeVersion)

  const { data: backshopPrevManualPluSetData, isSuccess: backshopPrevManualLoaded } =
    useBackshopPrevManualSupplementPluSet(effectiveVersionId)
  const backshopPrevManualPluSetForLayout = backshopPrevManualLoaded
    ? (backshopPrevManualPluSetData ?? null)
    : undefined

  const snapshotReadOnly = isSnapshot && location.pathname.startsWith('/super-admin')

  const { lineForceShowKeys: lineVisShowKeys, lineForceHideKeys: lineVisHideKeys } =
    useBackshopLineVisibilityOverrides()
  const lineForceShowKeysForList = useMemo(
    () => (snapshotReadOnly ? new Set<string>() : lineVisShowKeys),
    [snapshotReadOnly, lineVisShowKeys],
  )
  const lineForceHideKeysForList = useMemo(
    () => (snapshotReadOnly ? new Set<string>() : lineVisHideKeys),
    [snapshotReadOnly, lineVisHideKeys],
  )

  const [searchParams, setSearchParams] = useSearchParams()
  const snapshotSourceOnly: BackshopExcelSource | null = useMemo(() => {
    if (!isSnapshot || !snapshotReadOnly) return null
    const s = searchParams.get('source')
    if (!s || !(BACKSHOP_SOURCES as readonly string[]).includes(s)) return null
    return s as BackshopExcelSource
  }, [isSnapshot, snapshotReadOnly, searchParams])

  const { data: offerSlotsData, isFetched: offerSlotsFetched } = useBackshopOfferCampaignSlots()
  const offerSlots = useMemo(() => offerSlotsData ?? [], [offerSlotsData])

  const { previewForCampaign, offerPreviewSelectValue, onOfferPreviewChange } = useBackshopOfferPreviewUi({
    isSnapshot,
    resolvedBackshopVersion,
    offerSlots,
    offerSlotsFetched,
  })

  const {
    data: rawItems = [],
    isLoading: itemsLoading,
    isRefetching: itemsRefetching,
    error: itemsError,
    refetch: refetchItems,
  } = useBackshopPLUData(effectiveVersionId)

  const masterScopeItems = useMemo(() => {
    if (!snapshotSourceOnly) return rawItems
    return rawItems.filter((i) => (i.source ?? 'edeka') === snapshotSourceOnly)
  }, [rawItems, snapshotSourceOnly])

  const { data: backshopCarryoverRows = [] } = useStoreListCarryoverRows('backshop', effectiveVersionId)

  const carryoverMasterForActiveBackshop = useMemo(() => {
    if (!listVersion?.id) return []
    return backshopCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverBackshopRowToMasterItem(r, listVersion.id))
  }, [backshopCarryoverRows, listVersion?.id])

  const carryoverMasterScoped = useMemo(() => {
    if (!snapshotSourceOnly) return carryoverMasterForActiveBackshop
    return carryoverMasterForActiveBackshop.filter(
      (i) => (i.source ?? 'edeka') === snapshotSourceOnly,
    )
  }, [carryoverMasterForActiveBackshop, snapshotSourceOnly])

  const { data: customProductsFetched = [] } = useBackshopCustomProducts({
    enabled: !isSuperAdminCentralBackshopMasterView,
  })
  const customProducts = useMemo(
    () => (isSuperAdminCentralBackshopMasterView ? [] : customProductsFetched),
    [isSuperAdminCentralBackshopMasterView, customProductsFetched],
  )
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithPreview(previewForCampaign)
  const { data: backshopDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalPriceOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: bezeichnungsregeln = [] } = useBackshopBezeichnungsregeln()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()

  const { currentStoreId } = useCurrentStore()
  const { data: productGroups = [] } = useBackshopProductGroups()
  const { data: sourceChoices = [] } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)

  const blockPreferredSourceByBlockId = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of backshopBlockSourceRules) {
      m.set(r.block_id, r.preferred_source as BackshopSource)
    }
    return m
  }, [backshopBlockSourceRules])

  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const productGroupsForStore = useMemo(
    () => scopeProductGroupsByEffectiveBlock(productGroups, nameBlockOverrides),
    [productGroups, nameBlockOverrides],
  )

  const { productGroupByPluSource, chosenSourcesByGroup, productGroupNames } = useMemo(() => {
    const byPluSource = new Map<string, string>()
    const names = new Map<string, string>()
    for (const g of productGroupsForStore) {
      names.set(g.id, g.display_name)
      for (const mem of g.members) {
        byPluSource.set(`${mem.plu}|${mem.source}`, g.id)
      }
    }
    const chosen = new Map<string, BackshopSource[]>()
    for (const c of sourceChoices) {
      chosen.set(c.group_id, (c.chosen_sources ?? []) as BackshopSource[])
    }
    return {
      productGroupByPluSource: byPluSource,
      chosenSourcesByGroup: chosen,
      productGroupNames: names,
    }
  }, [productGroupsForStore, sourceChoices])

  const memberSourcesByGroup = useMemo(() => {
    const m = new Map<string, Set<BackshopSource>>()
    for (const g of productGroupsForStore) {
      const s = new Set<BackshopSource>()
      for (const mem of g.members) s.add(mem.source as BackshopSource)
      m.set(g.id, s)
    }
    return m
  }, [productGroupsForStore])

  const groupBlockIdByGroupId = useMemo(() => {
    const m = new Map<string, string | null>()
    for (const g of productGroupsForStore) m.set(g.id, g.block_id ?? null)
    return m
  }, [productGroupsForStore])

  const rawHiddenPluSet = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign, backshopDisabled),
    [rawHiddenPluSet, backshopCampaign, backshopDisabled],
  )
  const { kw: calendarKw, year: calendarJahr } = getBackshopWerbungKwYearFromDate(new Date())
  const effectiveWerbungEndKw =
    previewForCampaign.mode === 'explicit' ? previewForCampaign.kw : calendarKw
  const effectiveWerbungEndJahr =
    previewForCampaign.mode === 'explicit' ? previewForCampaign.jahr : calendarJahr

  const forwardWerbungSlots = useMemo(() => {
    const filtered = offerSlots.filter(
      (s) => compareIsoWeekPair(s.kw, s.jahr, calendarKw, calendarJahr) > 0,
    )
    return [...filtered].sort((a, b) => compareIsoWeekPair(a.kw, a.jahr, b.kw, b.jahr))
  }, [offerSlots, calendarKw, calendarJahr])

  const markYellowKwCount = layoutSettings?.mark_yellow_kw_count ?? 4
  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        effectiveWerbungEndKw,
        effectiveWerbungEndJahr,
        backshopCampaign ?? null,
        backshopDisabled,
        offerItems,
        backshopLocalPriceOverrides,
      ),
    [
      effectiveWerbungEndKw,
      effectiveWerbungEndJahr,
      backshopCampaign,
      backshopDisabled,
      offerItems,
      backshopLocalPriceOverrides,
    ],
  )

  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const displayMode = (layoutSettings?.display_mode ?? 'MIXED') as 'MIXED' | 'SEPARATED'
  const flowDirection = layoutSettings?.flow_direction ?? 'ROW_BY_ROW'
  const fontSizes = {
    header: layoutSettings?.font_header_px ?? 32,
    column: layoutSettings?.font_column_px ?? 18,
    product: layoutSettings?.font_product_px ?? 18,
  }

  const layoutChosenSourcesForList = useMemo(() => {
    if (snapshotReadOnly) return new Map<string, BackshopSource[]>()
    return chosenSourcesByGroup
  }, [snapshotReadOnly, chosenSourcesByGroup])

  const layoutBlockPreferredForList = useMemo(() => {
    if (snapshotReadOnly) return new Map<string, BackshopSource>()
    return blockPreferredSourceByBlockId
  }, [snapshotReadOnly, blockPreferredSourceByBlockId])

  const layoutGroupBlockIdByGroupIdForList = useMemo(() => {
    if (snapshotReadOnly) return new Map<string, string | null>()
    return groupBlockIdByGroupId
  }, [snapshotReadOnly, groupBlockIdByGroupId])

  const { displayItems, stats } = useBackshopMasterListDisplayList({
    masterScopeItems,
    carryoverMasterScoped,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    sortMode,
    blocks,
    customProducts,
    bezeichnungsregeln,
    renamedItems,
    markYellowKwCount,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  })

  const versionLoadingFlag = isSnapshot ? backshopVersionsLoading : activeVersionLoading
  const isLoading = versionLoadingFlag || itemsLoading
  const hasNoVersion = !isSnapshot && !versionLoadingFlag && !activeVersion

  const sourceArtNrByPlu = useMemo(
    () => buildSourceArtNrByPlu(masterScopeItems, carryoverMasterScoped),
    [masterScopeItems, carryoverMasterScoped],
  )

  const showWeekMonSat = layoutSettings?.show_week_mon_sat_in_labels ?? false

  return {
    isSnapshot,
    snapshotInvalid,
    snapshotReadOnly,
    snapshotSourceOnly,
    setSearchParams,
    resolvedBackshopVersion,
    effectiveVersionId,
    listVersion,
    activeVersion,
    versionLoading: versionLoadingFlag,
    itemsLoading,
    itemsRefetching,
    itemsError,
    refetchItems,
    isLoading,
    hasNoVersion,
    rawItems,
    masterScopeItems,
    carryoverMasterScoped,
    displayItems,
    stats,
    sortMode,
    displayMode,
    flowDirection,
    fontSizes,
    blocks,
    customProducts,
    storeBackshopNameOverrides,
    offerPreviewSelectValue,
    onOfferPreviewChange,
    forwardWerbungSlots,
    calendarKw,
    calendarJahr,
    effectiveWerbungEndKw,
    effectiveWerbungEndJahr,
    markYellowKwCount,
    showWeekMonSat,
    isSuperAdminCentralBackshopMasterView,
    sourceArtNrByPlu,
    bezeichnungsregeln,
    renamedItems,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    nameBlockOverrides,
    storeBackshopBlockOrder,
    productGroupByPluSource,
    memberSourcesByGroup,
    layoutChosenSourcesForList,
    productGroupNames,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  }
}
