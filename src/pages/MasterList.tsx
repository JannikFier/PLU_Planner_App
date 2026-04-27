// MasterList – Haupt-PLU-Tabelle mit Layout-Engine, Toolbar und globaler Liste

import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Archive,
  RefreshCw,
  ListFilter,
  Upload,
  Plus,
  EyeOff,
  FileDown,
  Pencil,
  Megaphone,
  Search,
  LayoutGrid,
  Info,
} from 'lucide-react'

// PLU-Komponenten
import { PLUListPageActionsMenu, type PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import { PLUTable, type PLUTableHandle } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'

const ExportPDFDialog = lazy(() =>
  import('@/components/plu/ExportPDFDialog').then((m) => ({ default: m.ExportPDFDialog })),
)

// Hooks
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
import { buildDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { useStoreObstBlockOrder, useStoreObstNameBlockOverrides } from '@/hooks/useStoreObstBlockLayout'
import type { PLUStats } from '@/lib/plu-helpers'
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

interface MasterListProps {
  mode: 'user' | 'admin' | 'viewer'
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
  // Prefix aus aktueller URL (nicht aus Rolle), damit Super-Admin in User-Ansicht dort bleibt
  const rolePrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'

  // Daten laden
  const { data: activeVersion, isLoading: versionLoading } = useActiveVersion()
  const { data: versions = [], isLoading: versionsLoading } = useVersions()

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
  const currentKw = offerKw
  const currentJahr = offerJahr
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

  useEffect(() => {
    if (!showPDFDialog) {
      setPdfExportVersionId(undefined)
      return
    }
    if (isSnapshot && resolvedVersion?.id) {
      setPdfExportVersionId((prev) => prev ?? resolvedVersion.id)
      return
    }
    if (activeVersion?.id) {
      setPdfExportVersionId((prev) => prev ?? activeVersion.id)
    }
  }, [showPDFDialog, isSnapshot, resolvedVersion?.id, activeVersion?.id])

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

  const pdfVersion = useMemo(
    () =>
      (pdfExportVersionId ? versions.find((v) => v.id === pdfExportVersionId) : undefined)
      ?? (isSnapshot ? listVersion : activeVersion)
      ?? undefined,
    [pdfExportVersionId, versions, isSnapshot, listVersion, activeVersion],
  )

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

  // Layout-Engine: Finale Anzeigeliste bauen
  const { displayItems, stats } = useMemo(() => {
    // Nur aktive Regeln verwenden
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({
        keyword: r.keyword,
        position: r.position,
        case_sensitive: r.case_sensitive,
      }))

    const version = listVersion
    const now = new Date()
    const result = buildDisplayList({
      masterItems: rawItems,
      carryoverMasterItems: carryoverMasterForActive,
      customProducts,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      renamedItems: renamedItems.map((r) => ({ plu: r.plu, display_name: r.display_name, is_manually_renamed: r.is_manually_renamed })),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: version?.kw_nummer ?? 0,
      versionJahr: version?.jahr ?? now.getFullYear(),
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
      obstPrevManualPluSet: obstPrevManualPluSetForLayout,
    })

    // Layout-Engine stats → PLUStats konvertieren
    const pluStats: PLUStats = {
      total: result.stats.total,
      unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
      newCount: result.stats.newCount,
      changedCount: result.stats.changedCount,
      hidden: result.stats.hidden,
      customCount: result.stats.customCount,
    }

    return { displayItems: result.items, stats: pluStats }
  }, [
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
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  ])

  const currentVersion = listVersion

  const showWeekMonSat = layoutSettings?.show_week_mon_sat_in_labels ?? false
  const versionDisplayKwLabel = useMemo(() => {
    if (!listVersion) return ''
    return formatKwLabelWithOptionalMonSatRange(
      listVersion.kw_label,
      listVersion.kw_nummer,
      listVersion.jahr,
      showWeekMonSat,
    )
  }, [listVersion, showWeekMonSat])

  const { displayItems: pdfDisplayItems, stats: pdfStats } = useMemo(() => {
    if (!pdfRawItems.length && !customProducts.length) {
      return { displayItems: [] as ReturnType<typeof buildDisplayList>['items'], stats: { total: 0, unchanged: 0, newCount: 0, changedCount: 0, hidden: 0, customCount: 0 } as PLUStats }
    }
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({ keyword: r.keyword, position: r.position, case_sensitive: r.case_sensitive }))
    const now = new Date()
    const result = buildDisplayList({
      masterItems: pdfRawItems,
      carryoverMasterItems: carryoverMasterForPdf,
      customProducts,
      hiddenPLUs: effectiveHiddenPLUs,
      offerDisplayByPlu,
      renamedItems: renamedItems.map((r) => ({ plu: r.plu, display_name: r.display_name, is_manually_renamed: r.is_manually_renamed })),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: pdfVersion?.kw_nummer ?? 0,
      versionJahr: pdfVersion?.jahr ?? now.getFullYear(),
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeObstBlockOrder,
      obstPrevManualPluSet: obstPrevManualPluSetForLayout,
    })
    return {
      displayItems: result.items,
      stats: {
        total: result.stats.total,
        unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
        newCount: result.stats.newCount,
        changedCount: result.stats.changedCount,
        hidden: result.stats.hidden,
        customCount: result.stats.customCount,
      } as PLUStats,
    }
  }, [
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
    pdfVersion,
    currentKw,
    currentJahr,
    nameBlockOverrides,
    storeObstBlockOrder,
    obstPrevManualPluSetForLayout,
  ])

  const pdfExportKwLabel = useMemo(() => {
    if (!pdfVersion) return ''
    return formatKwLabelWithOptionalMonSatRange(
      pdfVersion.kw_label,
      pdfVersion.kw_nummer,
      pdfVersion.jahr,
      showWeekMonSat,
    )
  }, [pdfVersion, showWeekMonSat])

  const snapshotReadOnly = isSnapshot && mode === 'admin'

  // Loading-State
  const isLoading =
    (!isSnapshot && (versionLoading || versionsLoading)) ||
    (isSnapshot && versionsLoading) ||
    itemsLoading

  // Keine Version? Kurz-Hinweis statt endlos warten (nur Live-Liste)
  const hasNoVersion =
    !isSnapshot && !versionLoading && !versionsLoading && !activeVersion && versions.length === 0

  // Wenn Versionen existieren, aber keine aktive: neueste automatisch auf active setzen
  useEffect(() => {
    if (isSnapshot) return
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
  }, [versionLoading, versionsLoading, versions, queryClient])

  // Tab wurde sichtbar: Browser throttelt Hintergrund-Tabs – Re-Render erzwingen,
  // damit bereits geladene Daten sofort angezeigt werden (sonst erst nach Klick).
  const pluTableRef = useRef<PLUTableHandle>(null)

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
    if (mode === 'viewer') return []
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
    <DashboardLayout>
      <div className="space-y-4">
        {/* === Header: Schmal – kompakt (Titel | Aktionen-Menü) === */}
        <div className="lg:hidden flex items-center justify-between gap-3 min-w-0">
          <h2
            className="text-[15px] font-bold leading-snug tracking-tight min-w-0"
            title="PLU Obst und Gemüse"
          >
            PLU Obst und Gemüse
            {mode === 'admin' && (
              <Badge variant="outline" className="ml-1.5 text-[10px] font-normal align-middle shrink-0">
                {snapshotReadOnly ? 'Archiv' : 'Admin'}
              </Badge>
            )}
          </h2>
          {currentVersion && !isLoading && !hasNoVersion && !snapshotInvalid && (
            <PLUListPageActionsMenu ariaLabel="Listen-Aktionen" items={obstMobileMenuItems} />
          )}
        </div>

        {/* === Header: Ab lg (breit) === */}
        <div className="hidden lg:flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              PLU Obst und Gemüse
              {mode === 'admin' && (
                <Badge variant="outline" className="ml-2 text-xs font-normal align-middle">
                  {snapshotReadOnly ? 'Archiv' : 'Admin'}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {snapshotReadOnly
                ? 'Eingespielter Listenstand dieser Kalenderwoche (nur Lesen).'
                : `Aktuelle eingespielte Liste – ${
                    mode === 'admin'
                      ? 'verwalten und bearbeiten.'
                      : 'deine PLU-Übersicht für Obst & Gemüse.'
                  }`}
            </p>
          </div>

          {mode === 'admin' && !snapshotReadOnly && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                onClick={() => {
                  closeObstListSearch()
                  navigate('/super-admin/plu-upload')
                }}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Neuer Upload
              </Button>
            </div>
          )}
        </div>

        {isSnapshot && resolvedVersion && (
          <Alert>
            <Archive className="h-4 w-4" />
            <AlertTitle>Archivansicht</AlertTitle>
            <AlertDescription>
              Liste und Werbung beziehen sich auf{' '}
              <span className="font-medium text-foreground">{versionDisplayKwLabel}</span>. Bearbeiten ist hier
              deaktiviert.
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
                  Diese Version gibt es nicht oder wurde gelöscht.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  closeObstListSearch()
                  navigate('/super-admin/versions')
                }}
              >
                Zurück zu Versionen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* === Toolbar === */}
        {currentVersion && !isLoading && !snapshotInvalid && (
          <div
            className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-between"
            data-tour="obst-master-toolbar"
          >
            {/* Links: Suche + Infos (min-w-0 damit Text schrumpft statt Aktionen zu verdrängen) */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                data-tour="masterlist-search"
                data-plu-find-in-page-trigger
                onClick={() => pluTableRef.current?.openFindInPage()}
                aria-label="In Liste suchen"
                title="In Liste suchen (PLU oder Name)"
              >
                <Search className="h-4 w-4" />
              </Button>
              {/* Anzeige-Infos: Sortierung, Darstellung (Stück/Gewicht), KW, Aktiv */}
              <div
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:max-w-none"
                data-tour="masterlist-context-line"
              >
                <ListFilter className="h-4 w-4 shrink-0" />
                <span title="Layout-Sortierung">
                  {sortMode === 'BY_BLOCK' ? 'Nach Warengruppen' : 'Alphabetisch (A–Z)'}
                </span>
                <span className="text-border">|</span>
                <span title="Layout-Anzeige Stück/Gewicht">
                  {displayMode === 'MIXED'
                    ? 'Stück + Gewicht gemischt'
                    : 'Nach Typ getrennt'}
                </span>
                <span className="text-border">|</span>
                <span className="text-foreground font-medium" title="Stammdaten aus zuletzt eingespielter Liste (wechselt nur bei neuem Upload)">
                  Liste {versionDisplayKwLabel}
                </span>
                {currentVersion.status === 'active' && (
                  <Badge variant="default" className="text-xs">Aktiv</Badge>
                )}
                {currentVersion.status === 'frozen' && (
                  <Badge variant="outline" className="text-xs">Archiv</Badge>
                )}
              </div>
            </div>

            {/* Rechts: Aktionen ab lg (eine Zeile, rechtsbündig) */}
            <div className="hidden lg:flex shrink-0 flex-nowrap items-center gap-2" data-tour="masterlist-toolbar-actions">
              {mode !== 'viewer' && !snapshotReadOnly && (
                <>
                  {featuresCustomProducts && (
                  <Button
                    variant="outline"
                    size="sm"
                    data-tour="masterlist-toolbar-eigene-produkte"
                    onClick={() => {
                      closeObstListSearch()
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/custom-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Eigene Produkte
                  </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    data-tour="masterlist-toolbar-ausgeblendete"
                    onClick={() => {
                      closeObstListSearch()
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/hidden-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    Ausgeblendete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    data-tour="masterlist-toolbar-werbung"
                    onClick={() => {
                      closeObstListSearch()
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/offer-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <Megaphone className="h-4 w-4 mr-1" />
                    Werbung
                  </Button>
                </>
              )}
              {mode !== 'viewer' && !snapshotReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  data-tour="masterlist-toolbar-umbenennen"
                  onClick={() => {
                    closeObstListSearch()
                    const backTo = location.pathname + location.search
                    navigate(`${rolePrefix}/renamed-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Umbenennen
                </Button>
              )}
              {sortMode === 'BY_BLOCK' && !snapshotReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  data-tour="masterlist-toolbar-warengruppen"
                    onClick={() => {
                      closeObstListSearch()
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/obst-warengruppen?backTo=${encodeURIComponent(backTo)}`, {
                        state: { backTo },
                      })
                    }}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Warengruppen
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                data-tour="masterlist-toolbar-pdf"
                onClick={() => {
                  closeObstListSearch()
                  setShowPDFDialog(true)
                }}
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
            {/* Viewer: PDF auf dem Handy ohne ⋮-Menü */}
            {mode === 'viewer' && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 lg:hidden"
                onClick={() => {
                  closeObstListSearch()
                  setShowPDFDialog(true)
                }}
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
        )}

        {currentVersion &&
          !isLoading &&
          !snapshotInvalid &&
          !hasNoVersion &&
          storeObstNameOverrides.length > 0 &&
          sortMode === 'ALPHABETICAL' && (
            <Alert data-testid="masterlist-wg-sort-hint">
              <Info className="h-4 w-4" />
              <AlertTitle>Markt-Zuordnungen zu Warengruppen</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Für diesen Markt gibt es Zuordnungen aus der Warengruppen-Workbench. Bei Sortierung{' '}
                  <strong>Alphabetisch (A–Z)</strong> erscheinen keine Warengruppen-Abschnitte – Artikel stehen nur
                  alphabetisch. Stellen Sie in den Layout-Einstellungen (Obst) die Sortierung auf{' '}
                  <strong>Nach Warengruppen</strong>, um Gruppen und Zuordnungen wie in der Workbench zu sehen.
                </span>
                {(rolePrefix === '/admin' || rolePrefix === '/super-admin') && !snapshotReadOnly ? (
                  <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
                    <Link to={`${rolePrefix}/layout`} onClick={() => closeObstListSearch()}>
                      Layout-Einstellungen (Obst)
                    </Link>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground shrink-0">
                    Bitte eine Person mit Admin-Rechten: Sortierung „Nach Warengruppen“ im Layout (Obst) setzen.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

        {/* === Keine Version vorhanden === */}
        {hasNoVersion && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Keine Kalenderwoche vorhanden</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Es wurde noch keine PLU-Liste hochgeladen. Lade zuerst eine Excel-Datei über PLU Upload hoch.
              </p>
              {mode === 'admin' && (
                <Button
                  onClick={() => {
                    closeObstListSearch()
                    navigate('/super-admin/plu-upload')
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Zum PLU Upload
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* === Loading State (inkl. Refetch nach transientem Fehler) === */}
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

        {/* === Error State – nur wenn nicht gerade Refetch (verhindert kurzes Aufblitzen bei transientem Fehler) === */}
        {itemsError && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Fehler beim Laden der PLU-Daten</p>
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

        {/* === Leerer Zustand === */}
        {!isLoading && !itemsError && !hasNoVersion && !snapshotInvalid && displayItems.length === 0 && rawItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Keine PLU-Daten vorhanden</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {mode === 'admin'
                  ? 'Lade eine Excel-Datei hoch, um die PLU-Liste für diese KW zu erstellen.'
                  : 'Für diese Kalenderwoche wurden noch keine PLU-Daten hochgeladen.'}
              </p>
            </CardContent>
          </Card>
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
      {showPDFDialog && (
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
