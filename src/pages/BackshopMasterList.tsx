// BackshopMasterList – Backshop-PLU-Tabelle (Bild | PLU | Name)

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ListFilter,
  RefreshCw,
  AlertCircle,
  FileDown,
  Plus,
  EyeOff,
  Pencil,
  Megaphone,
  Search,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PLUListPageActionsMenu, type PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import { PLUTable, type PLUTableHandle } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'
const ExportBackshopPDFDialog = lazy(() =>
  import('@/components/plu/ExportBackshopPDFDialog').then((m) => ({ default: m.ExportBackshopPDFDialog })),
)
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopHiddenItems } from '@/hooks/useBackshopHiddenItems'
import { useBackshopOfferItems } from '@/hooks/useBackshopOfferItems'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { useBackshopRenamedItems } from '@/hooks/useBackshopRenamedItems'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import {
  useStoreBackshopBlockOrder,
  useStoreBackshopNameBlockOverrides,
} from '@/hooks/useStoreBackshopBlockLayout'
import type { PLUStats } from '@/lib/plu-helpers'
import { formatBackshopActiveListToolbarRange, getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { buildOfferDisplayMap } from '@/lib/offer-display'
import { effectiveHiddenPluSet } from '@/lib/hidden-visibility'
import {
  useBackshopOfferCampaignWithLines,
  useBackshopOfferStoreDisabled,
} from '@/hooks/useCentralOfferCampaigns'
import { useBackshopOfferLocalPriceOverrides } from '@/hooks/useOfferStoreLocalPrices'

/**
 * Backshop-Masterliste: Tabelle mit Bild, PLU, Name.
 * Immer die aktive eingespielte Liste (keine KW-/Archiv-Umschaltung auf der Seite).
 */
export function BackshopMasterList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isViewer, isSuperAdmin } = useAuth()

  const rolePrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'

  const { data: activeVersion, isLoading: versionLoading } = useActiveBackshopVersion()
  const { data: layoutSettings } = useBackshopLayoutSettings()

  const effectiveVersionId = activeVersion?.id

  const [showPdfDialog, setShowPdfDialog] = useState(false)

  const {
    data: rawItems = [],
    isLoading: itemsLoading,
    isRefetching: itemsRefetching,
    error: itemsError,
    refetch: refetchItems,
  } = useBackshopPLUData(effectiveVersionId)

  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: renamedItems = [] } = useBackshopRenamedItems()
  const { data: offerItems = [] } = useBackshopOfferItems()
  const { data: backshopCampaign } = useBackshopOfferCampaignWithLines()
  const { data: backshopDisabled = new Set() } = useBackshopOfferStoreDisabled()
  const { overrideMap: backshopLocalPriceOverrides } = useBackshopOfferLocalPriceOverrides(
    backshopCampaign ?? undefined,
  )
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: bezeichnungsregeln = [] } = useBackshopBezeichnungsregeln()
  const { data: storeBackshopBlockOrder = [] } = useStoreBackshopBlockOrder()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )

  const rawHiddenPluSet = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
  )
  const effectiveHiddenPLUs = useMemo(
    () => effectiveHiddenPluSet(rawHiddenPluSet, backshopCampaign),
    [rawHiddenPluSet, backshopCampaign],
  )
  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
  const markYellowKwCount = layoutSettings?.mark_yellow_kw_count ?? 4
  const offerDisplayByPlu = useMemo(
    () =>
      buildOfferDisplayMap(
        currentKw,
        currentJahr,
        backshopCampaign ?? null,
        backshopDisabled,
        offerItems,
        backshopLocalPriceOverrides,
      ),
    [currentKw, currentJahr, backshopCampaign, backshopDisabled, offerItems, backshopLocalPriceOverrides],
  )

  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const flowDirection = layoutSettings?.flow_direction ?? 'ROW_BY_ROW'
  const fontSizes = {
    header: layoutSettings?.font_header_px ?? 32,
    column: layoutSettings?.font_column_px ?? 18,
    product: layoutSettings?.font_product_px ?? 18,
  }

  const { displayItems, stats } = useMemo(() => {
    const result = buildBackshopDisplayList({
      masterItems: rawItems,
      hiddenPLUs: effectiveHiddenPLUs,
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
      bezeichnungsregeln,
      renamedItems,
      markYellowKwCount,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
    })
    const pluStats: PLUStats = {
      total: result.stats.total,
      unchanged: result.stats.total - result.stats.newCount - result.stats.changedCount,
      newCount: result.stats.newCount,
      changedCount: result.stats.changedCount,
      hidden: result.stats.hidden,
      customCount: result.stats.customCount,
    }
    return { displayItems: result.items, stats: pluStats }
  }, [rawItems, effectiveHiddenPLUs, offerDisplayByPlu, sortMode, blocks, customProducts, bezeichnungsregeln, renamedItems, markYellowKwCount, currentKw, currentJahr, nameBlockOverrides, storeBackshopBlockOrder])

  const currentVersion = activeVersion

  const pdfDisplayResult = useMemo(() => {
    if (!showPdfDialog) return { items: [], stats: { total: 0, newCount: 0, changedCount: 0, hidden: 0, customCount: 0 } }
    return buildBackshopDisplayList({
      masterItems: rawItems,
      hiddenPLUs: effectiveHiddenPLUs,
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
      bezeichnungsregeln,
      renamedItems,
      markYellowKwCount,
      currentKwNummer: currentKw,
      currentJahr,
      nameBlockOverrides,
      storeBlockOrder: storeBackshopBlockOrder,
    })
  }, [showPdfDialog, rawItems, effectiveHiddenPLUs, offerDisplayByPlu, sortMode, blocks, customProducts, bezeichnungsregeln, renamedItems, markYellowKwCount, currentKw, currentJahr, nameBlockOverrides, storeBackshopBlockOrder])

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

  const openPdfDialog = () => setShowPdfDialog(true)

  const pluTableRef = useRef<PLUTableHandle>(null)

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
  const hasNoVersion = !versionLoading && !activeVersion

  /** Mobile (max-sm): Aktionen im ⋮-Menü */
  const backshopMobileMenuItems = useMemo((): PLUListPageActionMenuItem[] => {
    if (isViewer) return []
    const backTo = location.pathname + location.search
    const nav = (path: string) => () =>
      navigate(`${rolePrefix}${path}?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
    const pdfDisabled = isLoading || displayItems.length === 0
    const items: PLUListPageActionMenuItem[] = [
      {
        label: 'Eigene Produkte',
        icon: <Plus className="h-4 w-4" />,
        onClick: nav('/backshop-custom-products'),
      },
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
    ]
    if (isSuperAdmin && location.pathname.startsWith('/super-admin')) {
      items.push({
        label: 'Warengruppen bearbeiten',
        icon: <LayoutGrid className="h-4 w-4" />,
        onClick: nav('/backshop-warengruppen'),
      })
    }
    items.push(
      {
        label: 'Umbenennen',
        icon: <Pencil className="h-4 w-4" />,
        onClick: nav('/backshop-renamed-products'),
      },
      {
        label: 'PDF exportieren',
        icon: <FileDown className="h-4 w-4" />,
        onClick: () => setShowPdfDialog(true),
        disabled: pdfDisabled,
      },
    )
    return items
  }, [
    isViewer,
    isSuperAdmin,
    isLoading,
    displayItems.length,
    location.pathname,
    location.search,
    rolePrefix,
    navigate,
  ])

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* === Header: Mobile – kurzer Titel + ⋮ (keine KW-Auswahl) === */}
        <div className="sm:hidden flex items-center justify-between gap-3 min-w-0">
          <h2 className="text-base font-bold leading-snug tracking-tight min-w-0" title="PLU-Liste Backshop">
            PLU Backshop
          </h2>
          {currentVersion && !isLoading && !hasNoVersion && (
            <PLUListPageActionsMenu ariaLabel="Listen-Aktionen" items={backshopMobileMenuItems} />
          )}
        </div>

        {/* === Header: Desktop === */}
        <div className="hidden sm:block space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">PLU-Liste Backshop</h2>
          <p className="text-sm text-muted-foreground">
            Aktuelle eingespielte Liste – Backshop-Produkte mit Bild, PLU und Name.
          </p>
        </div>

        {/* === Toolbar (wie MasterList: Infos links, Aktionen rechts) === */}
        {currentVersion && !isLoading && !hasNoVersion && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => pluTableRef.current?.openFindInPage()}
              aria-label="In Liste suchen"
              title="In Liste suchen (PLU oder Name)"
            >
              <Search className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground sm:flex-initial sm:max-w-none">
              <ListFilter className="h-4 w-4 shrink-0" />
              <span
                className="text-foreground font-medium"
                title="Zeitraum der aktuellen Backshop-Liste: Einspiel-KW bis heute (ISO-8601). Nach neuem Upload beginnt die Anzeige wieder mit einer einzelnen KW."
              >
                {formatBackshopActiveListToolbarRange(
                  currentVersion.kw_nummer,
                  currentVersion.jahr,
                  currentKw,
                  currentJahr,
                )}
              </span>
              {currentVersion.status === 'active' && (
                <Badge variant="default" className="text-xs">Aktiv</Badge>
              )}
              {currentVersion.status === 'frozen' && (
                <Badge variant="outline" className="text-xs">Archiv</Badge>
              )}
            </div>
            <div className="hidden sm:block sm:flex-1" />
            <div className="hidden sm:flex sm:flex-wrap items-center gap-2">
              {!isViewer && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/backshop-custom-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Eigene Produkte
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/backshop-hidden-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <EyeOff className="h-4 w-4 mr-1" />
                    Ausgeblendete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const backTo = location.pathname + location.search
                      navigate(`${rolePrefix}/backshop-offer-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                    }}
                  >
                    <Megaphone className="h-4 w-4 mr-1" />
                    Werbung
                  </Button>
                  {isSuperAdmin && location.pathname.startsWith('/super-admin') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const backTo = location.pathname + location.search
                        navigate(`${rolePrefix}/backshop-warengruppen?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                      }}
                    >
                      Warengruppen bearbeiten
                    </Button>
                  )}
                </>
              )}
              {!isViewer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const backTo = location.pathname + location.search
                    navigate(`${rolePrefix}/backshop-renamed-products?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Umbenennen
                </Button>
              )}
              {!hasNoVersion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPdfDialog}
                  disabled={isLoading || displayItems.length === 0}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              )}
            </div>
            {isViewer && !hasNoVersion && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 sm:hidden"
                onClick={openPdfDialog}
                disabled={isLoading || displayItems.length === 0}
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
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

        {(isLoading || (itemsError && itemsRefetching)) && !hasNoVersion && (
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

        {itemsError && !isLoading && !itemsRefetching && !hasNoVersion && (
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

        {!isLoading && !itemsError && !hasNoVersion && displayItems.length === 0 && rawItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">Keine Backshop-Daten für diese KW</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Für diese Kalenderwoche wurden noch keine Backshop-PLU-Daten hochgeladen.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !itemsError && !hasNoVersion && (displayItems.length > 0 || rawItems.length > 0) && (
          <>
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
            />
            <PLUFooter stats={stats} />
          </>
        )}

        {showPdfDialog && (
          <Suspense fallback={null}>
            <ExportBackshopPDFDialog
            open={showPdfDialog}
            onOpenChange={setShowPdfDialog}
            items={pdfDisplayResult.items}
            stats={pdfStats}
            kwLabel={activeVersion?.kw_label ?? 'Backshop'}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            versions={[]}
            selectedVersionId={undefined}
            onVersionChange={undefined}
            fontSizes={fontSizes}
          />
          </Suspense>
        )}
      </div>
    </DashboardLayout>
  )
}
