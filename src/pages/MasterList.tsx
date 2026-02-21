// MasterList – Haupt-PLU-Tabelle mit Layout-Engine, Toolbar und globaler Liste

import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  RefreshCw,
  ListFilter,
  Upload,
  Plus,
  EyeOff,
  FileDown,
  Pencil,
  Megaphone,
} from 'lucide-react'

// PLU-Komponenten
import { KWSelector } from '@/components/plu/KWSelector'
import { PLUTable } from '@/components/plu/PLUTable'
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
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { useAuth } from '@/hooks/useAuth'
// Layout-Engine + Helpers
import { buildDisplayList } from '@/lib/layout-engine'
import type { PLUStats } from '@/lib/plu-helpers'
import { getCurrentKW, getKWAndYearFromDate } from '@/lib/date-kw-utils'
import { getActiveOfferPLUs } from '@/lib/offer-utils'
import { ensureActiveVersion } from '@/lib/ensure-active-version'

interface MasterListProps {
  mode: 'user' | 'admin' | 'viewer'
}

/**
 * Masterliste – die Haupt-PLU-Ansicht.
 *
 * Orchestriert:
 * - Layout-Engine (baut finale Liste aus Master + Custom - Hidden + Regeln)
 * - KW-Auswahl (KWSelector)
 * - PLU-Tabelle (PLUTable mit DisplayItem[])
 * - Toolbar (Eigenes Produkt, Ausblenden, PDF, Ausgeblendete)
 * - Statistiken (PLUFooter)
 */
export function MasterList({ mode }: MasterListProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  // Prefix aus aktueller URL (nicht aus Rolle), damit Super-Admin in User-Ansicht dort bleibt
  const rolePrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'

  // Daten laden
  const { data: activeVersion, isLoading: versionLoading } = useActiveVersion()
  const { data: versions = [], isLoading: versionsLoading } = useVersions()
  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: customProducts = [] } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: offerItems = [] } = useOfferItems()
  const { data: regeln = [] } = useBezeichnungsregeln()

  const { kw: currentKw, year: currentJahr } = getKWAndYearFromDate(new Date())
  const offerPLUs = useMemo(
    () => getActiveOfferPLUs(offerItems, currentKw, currentJahr),
    [offerItems, currentKw, currentJahr],
  )

  // Gewählte Version (standardmäßig die aktive)
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(undefined)

  // Dialoge
  const [showPDFDialog, setShowPDFDialog] = useState(false)
  const [pdfExportVersionId, setPdfExportVersionId] = useState<string | undefined>(undefined)

  // Wenn keine Version manuell gewählt: aktive Version nehmen
  const effectiveVersionId = selectedVersionId ?? activeVersion?.id

  // PLU-Items für die gewählte Version laden
  const {
    data: rawItems = [],
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = usePLUData(effectiveVersionId)

  // PLU-Items für PDF-Export (gewählte KW im Dialog)
  const effectivePdfVersionId = pdfExportVersionId ?? effectiveVersionId ?? activeVersion?.id
  const { data: pdfRawItems = [] } = usePLUData(effectivePdfVersionId ?? '', {
    enabled: showPDFDialog && !!effectivePdfVersionId,
  })

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

    const version = selectedVersionId
      ? versions.find((v) => v.id === selectedVersionId) ?? activeVersion
      : activeVersion
    const now = new Date()
    const result = buildDisplayList({
      masterItems: rawItems,
      customProducts,
      hiddenPLUs: new Set(hiddenItems.map((h) => h.plu)),
      offerPLUs,
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: version?.kw_nummer ?? 0,
      versionJahr: version?.jahr ?? now.getFullYear(),
      currentKwNummer: getCurrentKW(),
      currentJahr: now.getFullYear(),
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
  }, [rawItems, customProducts, hiddenItems, offerPLUs, regeln, blocks, layoutSettings, sortMode, displayMode, activeVersion, selectedVersionId, versions])

  // Aktuelle Version finden (für Anzeige im Header)
  const currentVersion = useMemo(
    () => versions.find((v) => v.id === effectiveVersionId) ?? activeVersion,
    [versions, effectiveVersionId, activeVersion],
  )

  // PDF-Export: Display-Items für gewählte KW (aktuelle KW vorausgewählt)
  const pdfVersion = useMemo(
    () => versions.find((v) => v.id === effectivePdfVersionId) ?? activeVersion,
    [versions, effectivePdfVersionId, activeVersion],
  )
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
      customProducts,
      hiddenPLUs: new Set(hiddenItems.map((h) => h.plu)),
      offerPLUs,
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: pdfVersion?.kw_nummer ?? activeVersion?.kw_nummer ?? 0,
      versionJahr: pdfVersion?.jahr ?? activeVersion?.jahr ?? now.getFullYear(),
      currentKwNummer: getCurrentKW(),
      currentJahr: now.getFullYear(),
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
  }, [pdfRawItems, customProducts, hiddenItems, offerPLUs, regeln, blocks, layoutSettings, sortMode, displayMode, pdfVersion, activeVersion])

  // Loading-State
  const isLoading = versionLoading || versionsLoading || itemsLoading

  // Keine Version? Kurz-Hinweis statt endlos warten
  const hasNoVersion = !versionLoading && !versionsLoading && !activeVersion && versions.length === 0

  // Wenn Versionen existieren, aber keine aktive: neueste automatisch auf active setzen
  useEffect(() => {
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
  const [, setVisibilityTick] = useState(0)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') setVisibilityTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* === Header === */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              PLU-Masterliste
              {mode === 'admin' && (
                <Badge variant="outline" className="ml-2 text-xs font-normal align-middle">
                  Admin
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'admin'
                ? 'PLU-Liste verwalten und bearbeiten.'
                : 'Deine PLU-Übersicht für die aktuelle Kalenderwoche.'}
            </p>
          </div>

          {/* KW-Auswahl + Neuer Upload (nur Super-Admin / mode admin) */}
          <div className="flex items-center gap-2">
            {mode === 'admin' && (
              <Button onClick={() => navigate('/super-admin/plu-upload')} size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Neuer Upload
              </Button>
            )}
            {versionsLoading ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : (
              <KWSelector
                versions={versions}
                selectedId={effectiveVersionId}
                onSelect={setSelectedVersionId}
                disabled={isLoading}
              />
            )}
          </div>
        </div>

        {/* === Toolbar === */}
        {currentVersion && !isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Anzeige-Infos: links (Nach Typ getrennt, KW, Aktiv) */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              <span>
                {displayMode === 'MIXED'
                  ? 'Stück + Gewicht gemischt'
                  : 'Nach Typ getrennt'}
              </span>
              <span className="text-border">|</span>
              <span>{currentVersion.kw_label}</span>
              {currentVersion.status === 'active' && (
                <Badge variant="default" className="text-xs">Aktiv</Badge>
              )}
              {currentVersion.status === 'frozen' && (
                <Badge variant="outline" className="text-xs">Archiv</Badge>
              )}
            </div>

            <div className="flex-1" />

            {/* Aktionen: rechts (Viewer nur PDF) */}
            {mode !== 'viewer' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${rolePrefix}/custom-products`)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Eigene Produkte
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${rolePrefix}/hidden-products`)}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Ausgeblendete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${rolePrefix}/offer-products`)}
                >
                  <Megaphone className="h-4 w-4 mr-1" />
                  Werbung
                </Button>
              </>
            )}
            {(mode === 'admin' || (mode === 'user' && isAdmin)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${rolePrefix}/renamed-products`)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Umbenennen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPdfExportVersionId(undefined)
                setShowPDFDialog(true)
              }}
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
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
                <Button onClick={() => navigate('/super-admin/plu-upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Zum PLU Upload
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* === Loading State === */}
        {isLoading && !hasNoVersion && (
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

        {/* === Error State === */}
        {itemsError && !isLoading && !hasNoVersion && (
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
        {!isLoading && !itemsError && !hasNoVersion && displayItems.length === 0 && rawItems.length === 0 && (
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
        {!isLoading && !itemsError && !hasNoVersion && (displayItems.length > 0 || rawItems.length > 0) && (
          <>
            <PLUTable
              items={displayItems}
              displayMode={displayMode}
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              fontSizes={fontSizes}
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
            kwLabel={pdfVersion?.kw_label ?? ''}
            displayMode={displayMode}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            versions={versions}
            selectedVersionId={effectivePdfVersionId}
            onVersionChange={setPdfExportVersionId}
            fontSizes={fontSizes}
          />
        </Suspense>
      )}
    </DashboardLayout>
  )
}
