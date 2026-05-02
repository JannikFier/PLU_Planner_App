// MasterList – Haupt-PLU-Tabelle mit Layout-Engine, Toolbar und globaler Liste

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MasterListPageHeader } from '@/components/plu/MasterListPageHeader'
import { MasterListToolbar } from '@/components/plu/MasterListToolbar'
import {
  MasterListArchiveAlert,
  MasterListEmptyDataCard,
  MasterListLoadingSkeletonCard,
  MasterListNoVersionCard,
  MasterListPluErrorCard,
  MasterListSnapshotInvalidCard,
  MasterListWgSortHintAlert,
} from '@/components/plu/MasterListPageStates'
import type { PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import { Upload, Plus, EyeOff, FileDown, Pencil, Megaphone, LayoutGrid } from 'lucide-react'
import { PLUTable, type PLUTableHandle } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'
import { useRegisterKioskListFindInPage, useRegisterKioskListHeaderSummary, type KioskListHeaderSummary } from '@/contexts/KioskListFindContext'
import { useMasterListRouteContext } from '@/hooks/useMasterListRouteContext'
import { useMasterListDisplayList } from '@/hooks/useMasterListDisplayList'
import { useMasterListPdfDisplayList } from '@/hooks/useMasterListPdfDisplayList'
import { useMasterListPdfExportVersionSync } from '@/hooks/useMasterListPdfExportVersionSync'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useVersions } from '@/hooks/useVersions'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBlocks } from '@/hooks/useBlocks'
import { useCustomProducts } from '@/hooks/useCustomProducts'
import { useHiddenItems } from '@/hooks/useHiddenItems'
import { useOfferItems } from '@/hooks/useOfferItems'
import { useRenamedItems } from '@/hooks/useRenamedItems'
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
// Layout-Engine + Helpers
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import { formatKwLabelWithOptionalMonSatRange, getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import {
  useObstOfferCampaignForKwYear,
  useObstOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useObstOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'
import { ensureActiveVersion } from '@/lib/ensure-active-version'
import { useStoreListCarryoverRows } from '@/hooks/useStoreListCarryover'
import { carryoverObstRowToMasterItem } from '@/lib/carryover-master-snapshot'
import { useObstPrevManualSupplementPluSet } from '@/hooks/usePrevManualSupplementPluSet'
import { useAuth } from '@/hooks/useAuth'

const ExportPDFDialog = lazy(() =>
  import('@/components/plu/ExportPDFDialog').then((m) => ({ default: m.ExportPDFDialog })),
)

interface MasterListProps {
  mode: 'user' | 'admin' | 'viewer' | 'kiosk'
}

/**
 * Masterliste – die Haupt-PLU-Ansicht.
 *
 * Orchestriert:
 * - Layout-Engine (baut finale Liste aus Master + Custom - Hidden + Regeln)
 * - PLU-Tabelle (PLUTable mit DisplayItem[]) – immer aktive eingespielte Liste
 * - Toolbar (Eigenes Produkt, Ausblenden, PDF, Ausgeblendete)
 * - Statistiken (PLUFooter)
 */
export function MasterList({ mode }: MasterListProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { versionId: snapshotVersionId } = useParams<{ versionId?: string }>()
  const isSnapshot = Boolean(snapshotVersionId)
  const queryClient = useQueryClient()
  const { rolePrefix, readOnlyListMode, kioskLiveSkipVersions } = useMasterListRouteContext(mode, isSnapshot)

  // Auth-Zustand fuer Sicherheitsnetz unten (verhindert "Keine KW"-Karte vor erstem Query-Tick)
  const { session: authSession, isLoading: authLoading } = useAuth()
  const authReady = !authLoading && Boolean(authSession?.access_token)

  // Daten laden
  const { data: activeVersion, isLoading: versionLoading } = useActiveVersion()
  const { data: versions = [], isLoading: versionsLoading } = useVersions({
    enabled: !kioskLiveSkipVersions,
  })

  const resolvedVersion = useMemo(
    () => (snapshotVersionId ? versions.find((v) => v.id === snapshotVersionId) : undefined),
    [versions, snapshotVersionId],
  )
  const snapshotInvalid = isSnapshot && !versionsLoading && !resolvedVersion

  /** Live-Liste: aktiv; Archiv: gewählte Version aus URL. */
  const effectiveVersionId = snapshotInvalid
    ? undefined
    : isSnapshot
      ? snapshotVersionId
      : activeVersion?.id

  const listVersion = isSnapshot ? resolvedVersion : (resolvedVersion ?? activeVersion)
  const { data: obstPrevManualPluSetData, isSuccess: obstPrevManualLoaded } =
    useObstPrevManualSupplementPluSet(effectiveVersionId)
  const obstPrevManualPluSetForLayout = obstPrevManualLoaded ? (obstPrevManualPluSetData ?? null) : undefined
  const { data: layoutSettings } = useLayoutSettings()
  const featuresCustomProducts = layoutSettings?.features_custom_products ?? true
  const { data: blocks = [] } = useBlocks()
  const { data: customProducts = [] } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: offerItems = [] } = useOfferItems()
  const versionForObstCampaign = isSnapshot ? resolvedVersion : activeVersion
  const obstCampaignKwEnabled =
    !snapshotInvalid &&
    (isSnapshot ? Boolean(resolvedVersion) : Boolean(activeVersion))
  const { data: obstCampaign } = useObstOfferCampaignForKwYear(
    versionForObstCampaign?.kw_nummer,
    versionForObstCampaign?.jahr,
    obstCampaignKwEnabled,
  )
  const { data: obstDisabled = new Set() } = useObstOfferStoreDisabled()
  const { overrideMap: obstLocalPriceOverrides } = useObstOfferLocalPriceOverrides(obstCampaign ?? undefined)
  const { data: renamedItems = [] } = useRenamedItems()
  const { data: regeln = [] } = useBezeichnungsregeln()
  const { data: storeObstBlockOrder = [] } = useStoreObstBlockOrder()
  const { data: storeObstNameOverrides = [] } = useStoreObstNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeObstNameOverrides),
    [storeObstNameOverrides],
  )

  const { kw: calendarKw, year: calendarJahr } = getKWAndYearFromDate(new Date())
  const offerKw =
    isSnapshot && resolvedVersion
      ? resolvedVersion.kw_nummer
      : !isSnapshot && activeVersion
        ? activeVersion.kw_nummer
        : calendarKw
  const offerJahr =
    isSnapshot && resolvedVersion
      ? resolvedVersion.jahr
      : !isSnapshot && activeVersion
        ? activeVersion.jahr
        : calendarJahr

  const rawHiddenPluSet = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, obstCampaign, obstDisabled),
    [rawHiddenPluSet, obstCampaign, obstDisabled],
  )

  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        offerKw,
        offerJahr,
        obstCampaign ?? null,
        obstDisabled,
        offerItems,
        obstLocalPriceOverrides,
      ),
    [offerKw, offerJahr, obstCampaign, obstDisabled, offerItems, obstLocalPriceOverrides],
  )

  // Dialoge
  const [showPDFDialog, setShowPDFDialog] = useState(false)
  const [pdfExportVersionId, setPdfExportVersionId] = useState<string | undefined>(undefined)

  useMasterListPdfExportVersionSync({
    showPDFDialog,
    isSnapshot,
    resolvedVersionId: resolvedVersion?.id,
    activeVersionId: activeVersion?.id,
    setPdfExportVersionId,
  })

  // PLU-Items für die gewählte Version laden
  const {
    data: rawItems = [],
    isLoading: itemsLoading,
    isRefetching: itemsRefetching,
    error: itemsError,
    refetch: refetchItems,
  } = usePLUData(effectiveVersionId)

  // PLU-Items für PDF-Export: gewählte KW im PDF-Dialog
  const { data: pdfRawItems = [] } = usePLUData(pdfExportVersionId, {
    enabled: showPDFDialog && !!pdfExportVersionId,
  })

  const { data: pdfCarryoverRows = [] } = useStoreListCarryoverRows('obst', pdfExportVersionId)

  const carryoverMasterForPdf = useMemo(() => {
    if (!pdfExportVersionId) return []
    return pdfCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverObstRowToMasterItem(r, pdfExportVersionId))
  }, [pdfCarryoverRows, pdfExportVersionId])

  const { data: obstCarryoverRows = [] } = useStoreListCarryoverRows('obst', effectiveVersionId)

  const carryoverMasterForActive = useMemo(() => {
    if (!listVersion?.id) return []
    return obstCarryoverRows
      .filter((r) => r.market_include)
      .map((r) => carryoverObstRowToMasterItem(r, listVersion.id))
  }, [obstCarryoverRows, listVersion?.id])

  // Layout-Settings auslesen
  const displayMode = layoutSettings?.display_mode ?? 'MIXED'
  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const flowDirection = layoutSettings?.flow_direction ?? 'COLUMN_FIRST'
  const fontSizes = {
    header: layoutSettings?.font_header_px ?? 24,
    column: layoutSettings?.font_column_px ?? 16,
    product: layoutSettings?.font_product_px ?? 12,
  }

  const { displayItems, stats } = useMasterListDisplayList({
    rawItems,
    carryoverMasterForActive,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    listVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  })

  const currentVersion = listVersion

  const showWeekMonSat = layoutSettings?.show_week_mon_sat_in_labels ?? false

  const { pdfDisplayItems, pdfStats, pdfExportKwLabel } = useMasterListPdfDisplayList({
    pdfRawItems,
    carryoverMasterForPdf,
    customProducts,
    effectiveHiddenPLUs,
    offerDisplayByPlu,
    renamedItems,
    regeln,
    blocks,
    layoutSettings,
    sortMode,
    displayMode,
    pdfExportVersionId,
    versions,
    isSnapshot,
    listVersion,
    activeVersion,
    calendarKw,
    calendarJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
    showWeekMonSat,
  })

  const versionDisplayKwLabel = useMemo(() => {
    if (!listVersion) return ''
    return formatKwLabelWithOptionalMonSatRange(
      listVersion.kw_label,
      listVersion.kw_nummer,
      listVersion.jahr,
      showWeekMonSat,
    )
  }, [listVersion, showWeekMonSat])

  const kioskHeaderSummary = useMemo((): KioskListHeaderSummary | null => {
    if (!currentVersion || !versionDisplayKwLabel.trim()) return null
    return {
      kwLine: versionDisplayKwLabel,
      listStatus: currentVersion.status === 'frozen' ? 'frozen' : 'active',
    }
  }, [currentVersion, versionDisplayKwLabel])

  useRegisterKioskListHeaderSummary(kioskHeaderSummary, mode === 'kiosk')

  const snapshotReadOnly = isSnapshot && mode === 'admin'

  // Loading-State
  const isLoading =
    (!isSnapshot && (versionLoading || versionsLoading)) ||
    (isSnapshot && versionsLoading) ||
    itemsLoading

  // Keine Version? Kurz-Hinweis statt endlos warten (nur Live-Liste).
  // Sicherheitsnetz: nur wenn Auth-Session bereit ist – sonst koennte die Karte vor dem ersten
  // Query-Tick aufblitzen (Race direkt nach Reload, wenn session im AuthContext noch null ist).
  const hasNoVersion =
    !isSnapshot &&
    authReady &&
    !versionLoading &&
    (kioskLiveSkipVersions
      ? !activeVersion
      : !versionsLoading && !activeVersion && versions.length === 0)

  // Wenn Versionen existieren, aber keine aktive: neueste automatisch auf active setzen
  useEffect(() => {
    if (isSnapshot) return
    if (kioskLiveSkipVersions) return
    if (versionLoading || versionsLoading || versions.length === 0) return
    const hasActive = versions.some((v) => v.status === 'active')
    if (hasActive) return
    ensureActiveVersion(versions)
      .then((updated) => {
        if (updated) {
          void queryClient.invalidateQueries({ queryKey: ['versions'] })
          void queryClient.invalidateQueries({ queryKey: ['version', 'active'] })
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Aktive Version setzen fehlgeschlagen'))
  }, [isSnapshot, kioskLiveSkipVersions, versionLoading, versionsLoading, versions, queryClient])

  // Tab wurde sichtbar: Browser throttelt Hintergrund-Tabs – Re-Render erzwingen,
  // damit bereits geladene Daten sofort angezeigt werden (sonst erst nach Klick).
  const pluTableRef = useRef<PLUTableHandle>(null)
  const openKioskFindInPage = useCallback(() => {
    pluTableRef.current?.openFindInPage()
  }, [])
  useRegisterKioskListFindInPage(openKioskFindInPage, mode === 'kiosk')

  /** Find-in-Page-Leiste schließen (z. B. vor Navigation oder PDF), Ref kann null sein. */
  const closeObstListSearch = useCallback(() => {
    pluTableRef.current?.closeFindInPage()
  }, [])

  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') setVisibilityTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  /** Mobile (max-sm): Aktionen im ⋮-Menü – gleiche Ziele wie die Desktop-Buttons */
  const obstMobileMenuItems = useMemo((): PLUListPageActionMenuItem[] => {
    if (readOnlyListMode) return []
    if (snapshotReadOnly) {
      return [
        {
          label: 'PDF exportieren',
          icon: <FileDown className="h-4 w-4" />,
          onClick: () => {
            closeObstListSearch()
            setShowPDFDialog(true)
          },
        },
      ]
    }
    const backTo = location.pathname + location.search
    const nav = (path: string) => () => {
      closeObstListSearch()
      navigate(`${rolePrefix}${path}?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
    }
    const items: PLUListPageActionMenuItem[] = []
    if (mode === 'admin') {
      items.push({
        label: 'Neuer Upload',
        icon: <Upload className="h-4 w-4" />,
        onClick: () => {
          closeObstListSearch()
          navigate('/super-admin/plu-upload')
        },
        separatorAfter: true,
      })
    }
    if (featuresCustomProducts) {
      items.push({
        label: 'Eigene Produkte',
        icon: <Plus className="h-4 w-4" />,
        onClick: nav('/custom-products'),
      })
    }
    items.push(
      {
        label: 'Ausgeblendete',
        icon: <EyeOff className="h-4 w-4" />,
        onClick: nav('/hidden-products'),
      },
      {
        label: 'Werbung',
        icon: <Megaphone className="h-4 w-4" />,
        onClick: nav('/offer-products'),
      },
      {
        label: 'Umbenennen',
        icon: <Pencil className="h-4 w-4" />,
        onClick: nav('/renamed-products'),
      },
    )
    if (sortMode === 'BY_BLOCK') {
      items.push({
        label: 'Warengruppen',
        icon: <LayoutGrid className="h-4 w-4" />,
        onClick: nav('/obst-warengruppen'),
      })
    }
    items.push({
      label: 'PDF exportieren',
      icon: <FileDown className="h-4 w-4" />,
      onClick: () => {
        closeObstListSearch()
        setShowPDFDialog(true)
      },
    })
    return items
  }, [
    mode,
    readOnlyListMode,
    snapshotReadOnly,
    location.pathname,
    location.search,
    rolePrefix,
    navigate,
    featuresCustomProducts,
    sortMode,
    closeObstListSearch,
  ])

  return (
    <DashboardLayout hideHeader={mode === 'kiosk'}>
      <div className={mode === 'kiosk' ? 'space-y-2' : 'space-y-4'}>
        <MasterListPageHeader
          mode={mode}
          snapshotReadOnly={snapshotReadOnly}
          currentVersion={currentVersion}
          isLoading={isLoading}
          hasNoVersion={hasNoVersion}
          snapshotInvalid={snapshotInvalid}
          mobileMenuItems={obstMobileMenuItems}
          onNeuerUploadClick={() => {
            closeObstListSearch()
            navigate('/super-admin/plu-upload')
          }}
        />

        {isSnapshot && resolvedVersion && (
          <MasterListArchiveAlert kwLabel={versionDisplayKwLabel} />
        )}

        {snapshotInvalid && (
          <MasterListSnapshotInvalidCard
            onBack={() => {
              closeObstListSearch()
              navigate('/super-admin/versions')
            }}
          />
        )}

        {/* === Toolbar (nicht Kiosk — Kontext steht in KioskLayout-Kopfzeile) === */}
        {currentVersion && !isLoading && !snapshotInvalid && mode !== 'kiosk' && (
          <MasterListToolbar
            mode={mode}
            currentVersion={currentVersion}
            sortMode={sortMode}
            displayMode={displayMode}
            versionDisplayKwLabel={versionDisplayKwLabel}
            readOnlyListMode={readOnlyListMode}
            snapshotReadOnly={snapshotReadOnly}
            featuresCustomProducts={featuresCustomProducts}
            rolePrefix={rolePrefix}
            backTo={location.pathname + location.search}
            navigate={navigate}
            pluTableRef={pluTableRef}
            onBeforeNavigate={closeObstListSearch}
            onOpenPdfDialog={() => setShowPDFDialog(true)}
          />
        )}

        {currentVersion &&
          !isLoading &&
          !snapshotInvalid &&
          !hasNoVersion &&
          storeObstNameOverrides.length > 0 &&
          sortMode === 'ALPHABETICAL' && (
            <MasterListWgSortHintAlert
              showAdminLayoutLink={(rolePrefix === '/admin' || rolePrefix === '/super-admin') && !snapshotReadOnly}
              layoutSettingsHref={`${rolePrefix}/layout`}
              onBeforeNavigate={closeObstListSearch}
            />
          )}

        {/* === Keine Version vorhanden === */}
        {hasNoVersion && (
          <MasterListNoVersionCard
            showUploadButton={mode === 'admin'}
            onUploadClick={() => {
              closeObstListSearch()
              navigate('/super-admin/plu-upload')
            }}
          />
        )}

        {/* === Loading State (inkl. Refetch nach transientem Fehler) === */}
        {(isLoading || (itemsError && itemsRefetching)) && !hasNoVersion && !snapshotInvalid && (
          <MasterListLoadingSkeletonCard />
        )}

        {/* === Error State – nur wenn nicht gerade Refetch (verhindert kurzes Aufblitzen bei transientem Fehler) === */}
        {itemsError && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <MasterListPluErrorCard
            message={itemsError instanceof Error ? itemsError.message : 'Unbekannter Fehler'}
            onRetry={() => refetchItems()}
          />
        )}

        {/* === Leerer Zustand === */}
        {!isLoading && !itemsError && !hasNoVersion && !snapshotInvalid && displayItems.length === 0 && rawItems.length === 0 && (
          <MasterListEmptyDataCard isAdminMode={mode === 'admin'} />
        )}

        {/* === PLU-Tabelle === */}
        {!isLoading && !itemsError && !hasNoVersion && !snapshotInvalid && (displayItems.length > 0 || rawItems.length > 0) && (
          <>
            <PLUTable
              ref={pluTableRef}
              items={displayItems}
              displayMode={displayMode}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              obstStoreBlockOrder={storeObstBlockOrder}
              fontSizes={fontSizes}
              showFindInPage
              findInPageExternalTrigger
            />

            {/* === Footer mit Statistiken === */}
            <PLUFooter stats={stats} />
          </>
        )}
      </div>

      {/* === Dialoge – PDF-Export lazy, damit jspdf/html2canvas erst bei Öffnen geladen werden === */}
      {showPDFDialog && mode !== 'kiosk' && (
        <Suspense fallback={null}>
          <ExportPDFDialog
            open={showPDFDialog}
            onOpenChange={setShowPDFDialog}
            items={pdfDisplayItems}
            stats={pdfStats}
            kwLabel={pdfExportKwLabel || versionDisplayKwLabel}
            displayMode={displayMode}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            obstStoreBlockOrder={storeObstBlockOrder}
            versions={versions}
            selectedVersionId={pdfExportVersionId}
            onVersionChange={snapshotReadOnly ? undefined : setPdfExportVersionId}
            fontSizes={fontSizes}
            showWeekMonSat={showWeekMonSat}
          />
        </Suspense>
      )}
    </DashboardLayout>
  )
}
