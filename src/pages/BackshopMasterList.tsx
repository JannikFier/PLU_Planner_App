// BackshopMasterList – Backshop-PLU-Tabelle (Bild | PLU | Name)

import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListFilter, RefreshCw, AlertCircle, FileDown, Plus, EyeOff, Pencil } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { KWSelector } from '@/components/plu/KWSelector'
import { PLUTable } from '@/components/plu/PLUTable'
import { PLUFooter } from '@/components/plu/PLUFooter'
import { ExportBackshopPDFDialog } from '@/components/plu/ExportBackshopPDFDialog'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useBackshopCustomProducts } from '@/hooks/useBackshopCustomProducts'
import { useBackshopHiddenItems } from '@/hooks/useBackshopHiddenItems'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopBezeichnungsregeln } from '@/hooks/useBackshopBezeichnungsregeln'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import type { PLUStats } from '@/lib/plu-helpers'

/**
 * Backshop-Masterliste: Tabelle mit Bild, PLU, Name.
 * Phase 3: Nur Anzeige, keine Custom/Hidden; PDF und Upload über eigene Seiten.
 */
export function BackshopMasterList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()

  const rolePrefix =
    location.pathname.startsWith('/super-admin') ? '/super-admin'
    : location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/viewer') ? '/viewer'
    : '/user'
  const isViewer = profile?.role === 'viewer'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const { data: activeVersion, isLoading: versionLoading } = useActiveBackshopVersion()
  const { data: versions = [], isLoading: versionsLoading } = useBackshopVersions()
  const { data: layoutSettings } = useBackshopLayoutSettings()

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(undefined)
  const effectiveVersionId = selectedVersionId ?? activeVersion?.id

  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [pdfDialogVersionId, setPdfDialogVersionId] = useState<string | undefined>(undefined)

  const {
    data: rawItems = [],
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchItems,
  } = useBackshopPLUData(effectiveVersionId)

  const { data: pdfRawItems = [] } = useBackshopPLUData(pdfDialogVersionId, {
    enabled: showPdfDialog && !!pdfDialogVersionId,
  })

  const { data: customProducts = [] } = useBackshopCustomProducts()
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: bezeichnungsregeln = [] } = useBackshopBezeichnungsregeln()

  const hiddenPLUs = useMemo(
    () => new Set(hiddenItems.map((h) => h.plu)),
    [hiddenItems],
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
      hiddenPLUs,
      sortMode,
      blocks,
      customProducts,
      bezeichnungsregeln,
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
  }, [rawItems, hiddenPLUs, sortMode, blocks, customProducts, bezeichnungsregeln])

  const currentVersion = useMemo(
    () => versions.find((v) => v.id === effectiveVersionId) ?? activeVersion,
    [versions, effectiveVersionId, activeVersion],
  )

  const pdfDialogVersion = useMemo(
    () => (pdfDialogVersionId ? versions.find((v) => v.id === pdfDialogVersionId) : null),
    [versions, pdfDialogVersionId],
  )

  const pdfDisplayResult = useMemo(() => {
    if (!showPdfDialog || !pdfDialogVersionId) return { items: [], stats: { total: 0, newCount: 0, changedCount: 0, hidden: 0, customCount: 0 } }
    return buildBackshopDisplayList({
      masterItems: pdfRawItems,
      hiddenPLUs,
      sortMode,
      blocks,
      customProducts,
      bezeichnungsregeln,
    })
  }, [showPdfDialog, pdfDialogVersionId, pdfRawItems, hiddenPLUs, sortMode, blocks, customProducts, bezeichnungsregeln])

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

  const openPdfDialog = () => {
    setPdfDialogVersionId(effectiveVersionId ?? undefined)
    setShowPdfDialog(true)
  }

  const isLoading = versionLoading || versionsLoading || itemsLoading
  const hasNoVersion = !versionLoading && !versionsLoading && !activeVersion && versions.length === 0

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* === Header (wie MasterList) === */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">PLU-Liste Backshop</h2>
            <p className="text-sm text-muted-foreground">
              Backshop-Produkte mit Bild, PLU und Name.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {versionsLoading ? (
              <Skeleton className="h-9 w-[200px]" />
            ) : (
              <KWSelector
                versions={versions as import('@/types/database').Version[]}
                selectedId={effectiveVersionId}
                onSelect={setSelectedVersionId}
                disabled={isLoading}
              />
            )}
          </div>
        </div>

        {/* === Toolbar (wie MasterList: Infos links, Aktionen rechts) === */}
        {currentVersion && !isLoading && !hasNoVersion && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              <span>{currentVersion.kw_label}</span>
              {currentVersion.status === 'active' && (
                <Badge variant="default" className="text-xs">Aktiv</Badge>
              )}
              {currentVersion.status === 'frozen' && (
                <Badge variant="outline" className="text-xs">Archiv</Badge>
              )}
            </div>
            <div className="flex-1" />
            {!isViewer && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${rolePrefix}/backshop-custom-products`)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Eigene Produkte
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`${rolePrefix}/backshop-hidden-products`)}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Ausgeblendete
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${rolePrefix}/backshop-renamed-products`)}
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

        {itemsError && !isLoading && !hasNoVersion && (
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
              items={displayItems}
              displayMode="MIXED"
              sortMode={sortMode}
              flowDirection={flowDirection}
              blocks={blocks}
              fontSizes={fontSizes}
              listType="backshop"
            />
            <PLUFooter stats={stats} />
          </>
        )}

        {showPdfDialog && (
          <ExportBackshopPDFDialog
            open={showPdfDialog}
            onOpenChange={setShowPdfDialog}
            items={pdfDisplayResult.items}
            stats={pdfStats}
            kwLabel={pdfDialogVersion?.kw_label ?? 'Backshop'}
            sortMode={sortMode}
            flowDirection={flowDirection}
            blocks={blocks}
            versions={versions}
            selectedVersionId={pdfDialogVersionId}
            onVersionChange={setPdfDialogVersionId}
            fontSizes={fontSizes}
            pageBreakPerBlock={layoutSettings?.page_break_per_block ?? false}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
