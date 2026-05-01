// BackshopMasterList – Backshop-PLU-Tabelle (Bild | PLU | Name)

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation, useParams, useSearchParams, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Archive,
  ListFilter,
  RefreshCw,
  AlertCircle,
  FileDown,
  Plus,
  EyeOff,
  Pencil,
  Megaphone,
  GitCompareArrows,
  LayoutGrid,
  Info,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BackshopMasterListPageHeader } from '@/components/plu/BackshopMasterListPageHeader'
import { BackshopMasterListToolbar } from '@/components/plu/BackshopMasterListToolbar'
import type { PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import { PLUTable, type PLUTableHandle } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'
const ExportBackshopPDFDialog = lazy(() =>
  import('@/components/plu/ExportBackshopPDFDialog').then((m) => ({ default: m.ExportBackshopPDFDialog })),
)
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
import { buildBackshopDisplayList, toBackshopCustomProductInput } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import type { PLUStats } from '@/lib/plu-helpers'
import {
  compareIsoWeekPair,
  formatBackshopWerbungContextPlainLabel,
  formatKwLabelWithOptionalMonSatRange,
  getBackshopToolbarWerbungLayout,
  getBackshopWerbungKwYearFromDate,
} from '@/lib/date-kw-utils'
import { writeBackshopOfferPreviewSelection } from '@/lib/backshop-master-offer-preview'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import {
  useBackshopOfferCampaignSlots,
  useBackshopOfferCampaignWithPreview,
  useBackshopOfferStoreDisabled,
  type BackshopOfferPreviewSelection,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBackshopSourceChoicesForStore } from '@/hooks/useBackshopSourceChoices'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import type { BackshopSource } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import { useRegisterKioskListFindInPage, useRegisterKioskListHeaderSummary, type KioskListHeaderSummary } from '@/contexts/KioskListFindContext'
import { BACKSHOP_SOURCES, BACKSHOP_SOURCE_META, type BackshopExcelSource } from '@/lib/backshop-sources'
import { useRolePrefixFromLocation } from '@/hooks/useRolePrefixFromLocation'

/**
 * Backshop-Masterliste: Tabelle mit Bild, PLU, Name.
 * Immer die aktive eingespielte PLU-Liste; zentrale Werbung (KW) per Dropdown wählbar.
 */
export function BackshopMasterList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { versionId: snapshotVersionId } = useParams<{ versionId?: string }>()
  const isSnapshot = Boolean(snapshotVersionId)
  const { isViewer, isKiosk, isSuperAdmin } = useAuth()
  const listReadOnly = isViewer || isKiosk

  const rolePrefix = useRolePrefixFromLocation()

  /** Zentrale SA-Ansicht: keine marktspezifischen eigenen Produkte (Markt-Flow: backTo zu …/stores/…). */
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

  const versionLoading = isSnapshot ? backshopVersionsLoading : activeVersionLoading

  const [showPdfDialog, setShowPdfDialog] = useState(false)

  const [offerPreviewSelection, setOfferPreviewSelection] = useState<BackshopOfferPreviewSelection>({
    mode: 'auto',
  })

  /** Bei jedem Betreten der Live-Liste: Werbung wieder auf automatische aktuelle KW. */
  useEffect(() => {
    if (isSnapshot) return
    setOfferPreviewSelection({ mode: 'auto' })
    writeBackshopOfferPreviewSelection({ mode: 'auto' })
  }, [isSnapshot])

  const lockedSnapshotPreview = useMemo((): BackshopOfferPreviewSelection | null => {
    if (!isSnapshot || !resolvedBackshopVersion) return null
    return {
      mode: 'explicit',
      kw: resolvedBackshopVersion.kw_nummer,
      jahr: resolvedBackshopVersion.jahr,
    }
  }, [isSnapshot, resolvedBackshopVersion])

  const previewForCampaign = lockedSnapshotPreview ?? offerPreviewSelection

  const { data: offerSlotsData, isFetched: offerSlotsFetched } = useBackshopOfferCampaignSlots()
  const offerSlots = useMemo(() => offerSlotsData ?? [], [offerSlotsData])

  useEffect(() => {
    if (lockedSnapshotPreview) return
    if (!offerSlotsFetched) return
    if (offerPreviewSelection.mode !== 'explicit') return
    const ok = offerSlots.some(
      (s) => s.kw === offerPreviewSelection.kw && s.jahr === offerPreviewSelection.jahr,
    )
    if (!ok) {
      const next = { mode: 'auto' as const }
      setOfferPreviewSelection(next)
      writeBackshopOfferPreviewSelection(next)
    }
  }, [lockedSnapshotPreview, offerPreviewSelection, offerSlots, offerSlotsFetched])

  useEffect(() => {
    if (isSnapshot) return
    writeBackshopOfferPreviewSelection(offerPreviewSelection)
  }, [offerPreviewSelection, isSnapshot])

  const offerPreviewSelectValue = useMemo(() => {
    if (offerPreviewSelection.mode === 'auto') return 'auto'
    return `${offerPreviewSelection.jahr}:${offerPreviewSelection.kw}`
  }, [offerPreviewSelection])

  const onOfferPreviewChange = (v: string) => {
    if (v === 'auto') {
      setOfferPreviewSelection({ mode: 'auto' })
      return
    }
    const parts = v.split(':')
    const jahr = Number(parts[0])
    const kw = Number(parts[1])
    if (!Number.isFinite(jahr) || !Number.isFinite(kw)) return
    setOfferPreviewSelection({ mode: 'explicit', kw, jahr })
  }

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
      for (const m of g.members) {
        byPluSource.set(`${m.plu}|${m.source}`, g.id)
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
  /** Gewählte bzw. aktuelle Werbungs-KW (wie Toolbar-Ende); für Angebots-Matching und PDF-Kontext. */
  const effectiveWerbungEndKw =
    previewForCampaign.mode === 'explicit' ? previewForCampaign.kw : calendarKw
  const effectiveWerbungEndJahr =
    previewForCampaign.mode === 'explicit' ? previewForCampaign.jahr : calendarJahr

  /** Nur KW nach der aktuellen Kalenderwoche, für die eine Werbung existiert (nach vorne wählen). */
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
  const flowDirection = layoutSettings?.flow_direction ?? 'ROW_BY_ROW'
  const fontSizes = {
    header: layoutSettings?.font_header_px ?? 32,
    column: layoutSettings?.font_column_px ?? 18,
    product: layoutSettings?.font_product_px ?? 18,
  }

  /** SA-KW-Archiv: keine Markt-Markenwahl / keine Block-Quellen-Regel – alle Master-Quellen sichtbar. */
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

  const { displayItems, stats } = useMemo(() => {
    const result = buildBackshopDisplayList({
      masterItems: masterScopeItems,
      carryoverMasterItems: carryoverMasterScoped,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks,
      customProducts: customProducts.map(toBackshopCustomProductInput),
      bezeichnungsregeln,
      renamedItems,
      markYellowKwCount,
      // Eigene Produkte: „Neu“-Gelb nach Kalender-/Werbungs-Anker-KW, nicht nach reiner Listen-KW
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup: layoutChosenSourcesForList,
      productGroupNames,
      blockPreferredSourceByBlockId: layoutBlockPreferredForList,
      groupBlockIdByGroupId: layoutGroupBlockIdByGroupIdForList,
      backshopPrevManualPluSet: backshopPrevManualPluSetForLayout,
      lineForceShowKeys: lineForceShowKeysForList,
      lineForceHideKeys: lineForceHideKeysForList,
    })
    const pluStats: PLUStats = {
      total: result.stats.total,
      unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
      newCount: result.stats.newCount,
      changedCount: result.stats.changedCount,
      hidden: result.stats.hidden,
      customCount: result.stats.customCount,
    }
    return {
      displayItems: result.items,
      stats: pluStats,
    }
  }, [
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
    backshopPrevManualPluSetForLayout,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  ])

  const currentVersion = listVersion

  const showWeekMonSat = layoutSettings?.show_week_mon_sat_in_labels ?? false

  const werbungToolbarLayout = useMemo(() => {
    if (!currentVersion) return null
    return getBackshopToolbarWerbungLayout(
      currentVersion.kw_nummer,
      currentVersion.jahr,
      effectiveWerbungEndKw,
      effectiveWerbungEndJahr,
    )
  }, [currentVersion, effectiveWerbungEndKw, effectiveWerbungEndJahr])

  const showWerbungKwDropdown = forwardWerbungSlots.length > 0 && !snapshotReadOnly

  const versionDisplayKwLabelForPdf = useMemo(() => {
    if (!listVersion) return 'Backshop'
    return formatKwLabelWithOptionalMonSatRange(
      listVersion.kw_label,
      listVersion.kw_nummer,
      listVersion.jahr,
      showWeekMonSat,
    )
  }, [listVersion, showWeekMonSat])

  const kioskBackshopHeaderSummary = useMemo((): KioskListHeaderSummary | null => {
    if (!currentVersion) return null
    const kw = versionDisplayKwLabelForPdf.trim()
    if (!kw) return null
    return {
      kwLine: versionDisplayKwLabelForPdf,
      listStatus: currentVersion.status === 'frozen' ? 'frozen' : 'active',
    }
  }, [currentVersion, versionDisplayKwLabelForPdf])

  useRegisterKioskListHeaderSummary(kioskBackshopHeaderSummary, isKiosk)

  /** PDF-Titel/Dateiname: gleicher KW-Kontext wie Toolbar (inkl. gewählter Werbungs-KW). */
  const pdfContextKwLabel = useMemo(() => {
    if (!listVersion) return 'Backshop'
    return formatBackshopWerbungContextPlainLabel(
      listVersion.kw_nummer,
      listVersion.jahr,
      effectiveWerbungEndKw,
      effectiveWerbungEndJahr,
      showWeekMonSat,
    )
  }, [listVersion, effectiveWerbungEndKw, effectiveWerbungEndJahr, showWeekMonSat])

  const pdfDisplayResult = useMemo(() => {
    if (!showPdfDialog) return { items: [], stats: { total: 0, newCount: 0, changedCount: 0, hidden: 0, customCount: 0 } }
    const r = buildBackshopDisplayList({
      masterItems: masterScopeItems,
      carryoverMasterItems: carryoverMasterScoped,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      sortMode,
      blocks,
      customProducts: customProducts.map(toBackshopCustomProductInput),
      bezeichnungsregeln,
      renamedItems,
      markYellowKwCount,
      currentKwNummer: calendarKw,
      currentJahr: calendarJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
      productGroupByPluSource,
      memberSourcesByGroup,
      chosenSourcesByGroup: layoutChosenSourcesForList,
      productGroupNames,
      blockPreferredSourceByBlockId: layoutBlockPreferredForList,
      groupBlockIdByGroupId: layoutGroupBlockIdByGroupIdForList,
      backshopPrevManualPluSet: backshopPrevManualPluSetForLayout,
      lineForceShowKeys: lineForceShowKeysForList,
      lineForceHideKeys: lineForceHideKeysForList,
    })
    // Für den PDF-Export werden Konflikt-Platzhalter nicht gedruckt.
    return { ...r, items: r.items.filter((i) => !i.backshop_is_multi_source_placeholder) }
  }, [
    showPdfDialog,
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
    backshopPrevManualPluSetForLayout,
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
  ])

  const pdfStats: PLUStats = useMemo(
    () => ({
      total: pdfDisplayResult.stats.total,
      unchanged: pdfDisplayResult.stats.total - pdfDisplayResult.stats.newCount - pdfDisplayResult.stats.changedCount,
      newCount: pdfDisplayResult.stats.newCount,
      changedCount: pdfDisplayResult.stats.changedCount,
      hidden: pdfDisplayResult.stats.hidden,
      customCount: pdfDisplayResult.stats.customCount,
    }),
    [pdfDisplayResult.stats],
  )

  const pluTableRef = useRef<PLUTableHandle>(null)
  const openKioskBackshopFind = useCallback(() => {
    pluTableRef.current?.openFindInPage()
  }, [])
  useRegisterKioskListFindInPage(openKioskBackshopFind, isKiosk)

  const closeBackshopListSearch = useCallback(() => {
    pluTableRef.current?.closeFindInPage()
  }, [])

  const openPdfDialog = useCallback(() => {
    closeBackshopListSearch()
    setShowPdfDialog(true)
  }, [closeBackshopListSearch])

  const backshopMarkenTinderHrefForGroup = useCallback(
    (groupId: string) => {
      const backTo = location.pathname + location.search
      return `${rolePrefix}/marken-auswahl?backTo=${encodeURIComponent(backTo)}&focusGroup=${encodeURIComponent(groupId)}`
    },
    [rolePrefix, location.pathname, location.search],
  )

  // Tab wurde sichtbar: Browser throttelt Hintergrund-Tabs – Re-Render erzwingen
  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') setVisibilityTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const isLoading = versionLoading || itemsLoading
  const hasNoVersion = !isSnapshot && !versionLoading && !activeVersion

  const pdfDisabled = isLoading || displayItems.length === 0

  /** Schmale/mittlere Viewports (unter lg): Aktionen im Menü-Button (≡) */
  const backshopMobileMenuItems = useMemo((): PLUListPageActionMenuItem[] => {
    if (listReadOnly) return []
    if (snapshotReadOnly) {
      return [
        {
          label: 'PDF exportieren',
          icon: <FileDown className="h-4 w-4" />,
          onClick: openPdfDialog,
          disabled: pdfDisabled,
        },
      ]
    }
    const backTo = location.pathname + location.search
    const nav = (path: string) => () => {
      closeBackshopListSearch()
      navigate(`${rolePrefix}${path}?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
    }
    const items: PLUListPageActionMenuItem[] = []
    if (!isSuperAdminCentralBackshopMasterView) {
      items.push({
        label: 'Eigene Produkte',
        icon: <Plus className="h-4 w-4" />,
        onClick: nav('/backshop-custom-products'),
      })
    }
    items.push(
      {
        label: 'Ausgeblendete',
        icon: <EyeOff className="h-4 w-4" />,
        onClick: nav('/backshop-hidden-products'),
      },
      {
        label: 'Werbung',
        icon: <Megaphone className="h-4 w-4" />,
        onClick: nav('/backshop-offer-products'),
      },
    )
    if (isSuperAdmin && location.pathname.startsWith('/super-admin')) {
      items.push({
        label: 'Warengruppen bearbeiten',
        icon: <LayoutGrid className="h-4 w-4" />,
        onClick: nav('/backshop-warengruppen'),
      })
    }
    items.push(
      {
        label: 'Marken-Auswahl',
        icon: <GitCompareArrows className="h-4 w-4" />,
        onClick: nav('/marken-auswahl'),
      },
      {
        label: 'Umbenennen',
        icon: <Pencil className="h-4 w-4" />,
        onClick: nav('/backshop-renamed-products'),
      },
      {
        label: 'PDF exportieren',
        icon: <FileDown className="h-4 w-4" />,
        onClick: openPdfDialog,
        disabled: pdfDisabled,
      },
    )
    return items
  }, [
    listReadOnly,
    snapshotReadOnly,
    isSuperAdmin,
    isSuperAdminCentralBackshopMasterView,
    location.pathname,
    location.search,
    rolePrefix,
    navigate,
    pdfDisabled,
    closeBackshopListSearch,
    openPdfDialog,
  ])

  return (
    <DashboardLayout hideHeader={location.pathname.startsWith('/kiosk')}>
      <div className={isKiosk ? 'space-y-2' : 'space-y-4'} data-tour="backshop-master-page">
        <BackshopMasterListPageHeader
          isKiosk={isKiosk}
          snapshotReadOnly={snapshotReadOnly}
          currentVersion={currentVersion}
          isLoading={isLoading}
          hasNoVersion={hasNoVersion}
          snapshotInvalid={snapshotInvalid}
          mobileMenuItems={backshopMobileMenuItems}
        />

        {isSnapshot && resolvedBackshopVersion && (
          <Alert data-tour="backshop-master-version-banner">
            <Archive className="h-4 w-4" />
            <AlertTitle>Archivansicht</AlertTitle>
            <AlertDescription>
              Liste und Werbung beziehen sich auf{' '}
              <span className="font-medium text-foreground">{versionDisplayKwLabelForPdf}</span>. Bearbeiten
              ist hier deaktiviert.
            </AlertDescription>
          </Alert>
        )}

        {snapshotInvalid && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium mb-1">Version nicht gefunden</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Diese Backshop-Version gibt es nicht oder wurde gelöscht.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  closeBackshopListSearch()
                  navigate('/super-admin/backshop-versions')
                }}
              >
                Zurück zu Backshop-Versionen
              </Button>
            </CardContent>
          </Card>
        )}

        {currentVersion && !isLoading && !hasNoVersion && !snapshotInvalid && !isKiosk && (
          <BackshopMasterListToolbar
            isKiosk={isKiosk}
            isViewer={isViewer}
            pluTableRef={pluTableRef}
            werbungToolbarLayout={werbungToolbarLayout}
            currentVersion={currentVersion}
            showWeekMonSat={showWeekMonSat}
            showWerbungKwDropdown={showWerbungKwDropdown}
            calendarKw={calendarKw}
            forwardWerbungSlots={forwardWerbungSlots}
            offerPreviewSelectValue={offerPreviewSelectValue}
            onOfferPreviewChange={onOfferPreviewChange}
            listReadOnly={listReadOnly}
            snapshotReadOnly={snapshotReadOnly}
            isSuperAdminCentralBackshopMasterView={isSuperAdminCentralBackshopMasterView}
            isSuperAdmin={isSuperAdmin}
            pathname={location.pathname}
            rolePrefix={rolePrefix}
            backTo={location.pathname + location.search}
            navigate={navigate}
            onBeforeNavigate={closeBackshopListSearch}
            openPdfDialog={openPdfDialog}
            pdfDisabled={pdfDisabled}
            hasNoVersion={hasNoVersion}
            isLoading={isLoading}
            displayItemsLength={displayItems.length}
          />
        )}

        {listVersion &&
          !isLoading &&
          !snapshotInvalid &&
          !hasNoVersion &&
          storeBackshopNameOverrides.length > 0 &&
          sortMode === 'ALPHABETICAL' && (
            <Alert data-testid="backshop-masterlist-wg-sort-hint">
              <Info className="h-4 w-4" />
              <AlertTitle>Markt-Zuordnungen zu Warengruppen (Backshop)</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Für diesen Markt gibt es Zuordnungen aus der Backshop-Warengruppen-Workbench. Bei Sortierung{' '}
                  <strong>Alphabetisch (A–Z)</strong> erscheinen keine Warengruppen-Abschnitte. Stellen Sie in den
                  Layout-Einstellungen (Backshop) die Sortierung auf <strong>Nach Warengruppen</strong>, um Gruppen
                  sichtbar zu machen.
                </span>
                {(rolePrefix === '/admin' || rolePrefix === '/super-admin') && !snapshotReadOnly ? (
                  <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                    <Link to={`${rolePrefix}/backshop-layout`} onClick={() => closeBackshopListSearch()}>
                      Layout-Einstellungen (Backshop)
                    </Link>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground shrink-0">
                    Bitte eine Person mit Admin-Rechten: Sortierung „Nach Warengruppen“ im Layout (Backshop) setzen.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

        {hasNoVersion && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Keine Backshop-Version vorhanden</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Es wurde noch keine Backshop-Liste hochgeladen. Nutze „Backshop Upload“ im Super-Admin-Bereich.
              </p>
            </CardContent>
          </Card>
        )}

        {snapshotSourceOnly && !hasNoVersion && !snapshotInvalid && resolvedBackshopVersion && (
          <Alert data-tour="backshop-master-source-filter">
            <AlertTitle className="flex flex-wrap items-center gap-2">
              Nur Quelle: {BACKSHOP_SOURCE_META[snapshotSourceOnly].label}
              <span className="text-muted-foreground font-normal text-sm">
                ({resolvedBackshopVersion.kw_label})
              </span>
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2 mt-2">
              Es werden nur PLUs dieser Marke angezeigt.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  closeBackshopListSearch()
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev)
                      next.delete('source')
                      return next
                    },
                    { replace: true },
                  )
                }}
              >
                Gesamte KW anzeigen
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {(isLoading || (itemsError && itemsRefetching)) && !hasNoVersion && !snapshotInvalid && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex gap-4">
                <Skeleton className="h-5 w-[80px]" />
                <Skeleton className="h-5 flex-1" />
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-[70px]" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {itemsError && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Fehler beim Laden der Backshop-Daten</p>
                <p className="text-sm text-muted-foreground">
                  {itemsError instanceof Error ? itemsError.message : 'Unbekannter Fehler'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchItems()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          !itemsError &&
          !hasNoVersion &&
          !snapshotInvalid &&
          displayItems.length === 0 &&
          masterScopeItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                {snapshotSourceOnly && rawItems.length > 0
                  ? `Keine PLUs für ${BACKSHOP_SOURCE_META[snapshotSourceOnly].label}`
                  : 'Keine Backshop-Daten für diese KW'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {snapshotSourceOnly && rawItems.length > 0
                  ? 'In dieser Kalenderwoche gibt es für diese Marke keine Master-PLU-Zeilen.'
                  : 'Für diese Kalenderwoche wurden noch keine Backshop-PLU-Daten hochgeladen.'}
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          !itemsError &&
          !hasNoVersion &&
          !snapshotInvalid &&
          (displayItems.length > 0 || masterScopeItems.length > 0) && (
          <div data-tour="backshop-master-table">
            <PLUTable
              ref={pluTableRef}
              items={displayItems}
              displayMode="MIXED"
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              fontSizes={fontSizes}
              listType="backshop"
              showFindInPage
              findInPageExternalTrigger
              backshopMarkenTinderHrefForGroup={
                snapshotReadOnly ? undefined : backshopMarkenTinderHrefForGroup
              }
            />
            <PLUFooter stats={stats} />
          </div>
        )}

        {showPdfDialog && !isKiosk && (
          <Suspense fallback={null}>
            <ExportBackshopPDFDialog
            open={showPdfDialog}
            onOpenChange={setShowPdfDialog}
            items={pdfDisplayResult.items}
            stats={pdfStats}
            kwLabel={pdfContextKwLabel}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            versions={[]}
            selectedVersionId={undefined}
            onVersionChange={undefined}
            fontSizes={fontSizes}
            showWeekMonSat={showWeekMonSat}
          />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  )
}
