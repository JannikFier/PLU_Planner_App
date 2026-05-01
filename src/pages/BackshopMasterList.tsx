// BackshopMasterList – Backshop-PLU-Tabelle (Bild | PLU | Name)

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  FileDown,
  Plus,
  EyeOff,
  Pencil,
  Megaphone,
  GitCompareArrows,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { BackshopMasterListPageHeader } from '@/components/plu/BackshopMasterListPageHeader'
import { BackshopMasterListToolbar } from '@/components/plu/BackshopMasterListToolbar'
import {
  BackshopMasterListArchiveAlert,
  BackshopMasterListEmptyDataCard,
  BackshopMasterListItemsErrorCard,
  BackshopMasterListLoadingSkeletonCard,
  BackshopMasterListNoVersionCard,
  BackshopMasterListSnapshotInvalidCard,
  BackshopMasterListSourceFilterAlert,
  BackshopMasterListWgSortHintAlert,
} from '@/components/plu/BackshopMasterListPageStates'
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
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import {
  compareIsoWeekPair,
  formatKwLabelWithOptionalMonSatRange,
  getBackshopToolbarWerbungLayout,
  getBackshopWerbungKwYearFromDate,
} from '@/lib/date-kw-utils'
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
import type { BackshopSource } from '@/types/database'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverBackshopRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useBackshopPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { useBackshopLineVisibilityOverrides } from '@/hooks/useBackshopLineVisibilityOverrides'
import { useRegisterKioskListFindInPage, useRegisterKioskListHeaderSummary, type KioskListHeaderSummary } from '@/contexts/KioskListFindContext'
import { BACKSHOP_SOURCES, BACKSHOP_SOURCE_META, type BackshopExcelSource } from '@/lib/backshop-sources'
import { useRolePrefixFromLocation } from '@/hooks/useRolePrefixFromLocation'
import { useBackshopOfferPreviewUi } from '@/hooks/useBackshopOfferPreviewUi'
import { useBackshopMasterListDisplayList } from '@/hooks/useBackshopMasterListDisplayList'
import { useBackshopMasterListPdfExportList } from '@/hooks/useBackshopMasterListPdfExportList'

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

  const currentVersion = listVersion

  const showWeekMonSat = layoutSettings?.show_week_mon_sat_in_labels ?? false

  const { pdfDisplayItems, pdfStats, pdfContextKwLabel } = useBackshopMasterListPdfExportList({
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
    layoutBlockPreferredForList,
    layoutGroupBlockIdByGroupIdForList,
    backshopPrevManualPluSetForLayout,
    lineForceShowKeysForList,
    lineForceHideKeysForList,
    listVersion,
    effectiveWerbungEndKw,
    effectiveWerbungEndJahr,
    showWeekMonSat,
  })

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
          <BackshopMasterListArchiveAlert kwLabel={versionDisplayKwLabelForPdf} />
        )}

        {snapshotInvalid && (
          <BackshopMasterListSnapshotInvalidCard
            onBack={() => {
              closeBackshopListSearch()
              navigate('/super-admin/backshop-versions')
            }}
          />
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
            <BackshopMasterListWgSortHintAlert
              showAdminLayoutLink={(rolePrefix === '/admin' || rolePrefix === '/super-admin') && !snapshotReadOnly}
              layoutSettingsHref={`${rolePrefix}/backshop-layout`}
              onBeforeNavigate={closeBackshopListSearch}
            />
          )}

        {hasNoVersion && <BackshopMasterListNoVersionCard />}

        {snapshotSourceOnly && !hasNoVersion && !snapshotInvalid && resolvedBackshopVersion && (
          <BackshopMasterListSourceFilterAlert
            sourceLabel={BACKSHOP_SOURCE_META[snapshotSourceOnly].label}
            kwLabel={resolvedBackshopVersion.kw_label}
            onClearSource={() => {
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
          />
        )}

        {(isLoading || (itemsError && itemsRefetching)) && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListLoadingSkeletonCard />
        )}

        {itemsError && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListItemsErrorCard
            message={itemsError instanceof Error ? itemsError.message : 'Unbekannter Fehler'}
            onRetry={() => refetchItems()}
          />
        )}

        {!isLoading &&
          !itemsError &&
          !hasNoVersion &&
          !snapshotInvalid &&
          displayItems.length === 0 &&
          masterScopeItems.length === 0 && (
            <BackshopMasterListEmptyDataCard
              snapshotSourceOnly={Boolean(snapshotSourceOnly)}
              rawItemsLength={rawItems.length}
              sourceLabel={snapshotSourceOnly ? BACKSHOP_SOURCE_META[snapshotSourceOnly].label : ''}
            />
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
            items={pdfDisplayItems}
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
