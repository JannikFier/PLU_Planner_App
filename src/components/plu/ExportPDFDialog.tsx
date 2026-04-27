// ExportPDFDialog: Dialog zum PDF-Export der PLU-Liste

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileDown, LayoutList, ListMinus, Loader2, Megaphone, Printer } from 'lucide-react'
import { generatePDF, type PdfExportContentMode } from '@/lib/pdf-generator'
import { toast } from 'sonner'
import { KWSelector } from '@/components/plu/KWSelector'
import { RadioCard } from '@/components/ui/radio-card'
import type { DisplayItem } from '@/types/plu'
import type { Block, StoreObstBlockOrder, Version } from '@/types/database'

interface ExportPDFDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: DisplayItem[]
  stats: {
    total: number
    hidden: number
    newCount: number
    changedCount: number
    customCount: number
  }
  kwLabel: string
  displayMode: 'MIXED' | 'SEPARATED'
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  /** Markt-Reihenfolge Obst-Warengruppen (wie in der Liste / `store_obst_block_order`) */
  obstStoreBlockOrder?: StoreObstBlockOrder[]
  /** Optionale KW-Auswahl: Liste der Versionen, aktuelle Auswahl, Callback */
  versions?: Version[]
  selectedVersionId?: string
  onVersionChange?: (versionId: string) => void
  /** Schriftgrößen aus Layout-Einstellungen (Überschrift, PLU-Artikel, Produkte) */
  fontSizes?: { header: number; column: number; product: number }
  /** KW-Dropdown: Mo–Sa zur ISO-KW (Layout-Einstellung). */
  showWeekMonSat?: boolean
}

/**
 * Dialog mit Vorschau-Infos und Download-Button für den PDF-Export.
 */
export function ExportPDFDialog({
  open,
  onOpenChange,
  items,
  stats,
  kwLabel,
  displayMode,
  sortMode,
  flowDirection,
  blocks,
  obstStoreBlockOrder,
  versions = [],
  selectedVersionId,
  onVersionChange,
  fontSizes,
  showWeekMonSat = false,
}: ExportPDFDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [primaryExport, setPrimaryExport] = useState<'full' | 'offers_only'>('full')
  const [fullListVariant, setFullListVariant] = useState<'with_offers' | 'without_offers'>('with_offers')

  const offerCount = items.filter((i) => i.is_offer).length
  const canExportOffers = offerCount > 0

  const exportMode: PdfExportContentMode =
    primaryExport === 'offers_only'
      ? 'offers_only'
      : fullListVariant === 'without_offers'
        ? 'full_without_offers'
        : 'full_with_offers'

  const handleDownload = useCallback(async () => {
    setIsGenerating(true)

    try {
      const doc = generatePDF({
        items,
        kwLabel,
        displayMode,
        sortMode,
        flowDirection,
        blocks,
        obstStoreBlockOrder,
        fontSizes,
        exportMode,
      })

      const safeLabel = kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName =
        exportMode === 'offers_only'
          ? `Angebote_Obst_${safeLabel}.pdf`
          : exportMode === 'full_without_offers'
            ? `PLU-Liste_${safeLabel}_ohne-Werbungshinweise.pdf`
            : `PLU-Liste_${safeLabel}.pdf`
      doc.save(fileName)
      toast.success('PDF heruntergeladen')
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsGenerating(false)
    }
  }, [
    items,
    kwLabel,
    displayMode,
    sortMode,
    flowDirection,
    blocks,
    obstStoreBlockOrder,
    fontSizes,
    exportMode,
    onOpenChange,
  ])

  const handlePrint = useCallback(async () => {
    setIsGenerating(true)

    try {
      const doc = generatePDF({
        items,
        kwLabel,
        displayMode,
        sortMode,
        flowDirection,
        blocks,
        obstStoreBlockOrder,
        fontSizes,
        exportMode,
      })

      // Kein doc.autoPrint() – würde auf Mac einen zweiten Druckdialog auslösen
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)

      // Iframe statt window.open – zuverlässiger, kein Pop-up, kein reCAPTCHA
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = 'none'
      iframe.src = url
      document.body.appendChild(iframe)

      const cleanupIframe = () => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
        URL.revokeObjectURL(url)
      }

      // Safety-Timeout: Blob-URL auf jeden Fall freigeben, auch wenn onload nie feuert
      const safetyTimeout = setTimeout(cleanupIframe, 60_000)

      iframe.onerror = () => {
        clearTimeout(safetyTimeout)
        cleanupIframe()
        toast.error('PDF konnte nicht im Druckdialog geöffnet werden')
      }

      iframe.onload = () => {
        try {
          iframe.contentWindow?.print()
          toast.success('Druckdialog geöffnet')
        } catch {
          toast.info('PDF heruntergeladen – öffne es und drucke mit Strg+P')
          doc.save(
            exportMode === 'offers_only'
              ? `Angebote_Obst_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
              : exportMode === 'full_without_offers'
                ? `PLU-Liste_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_ohne-Werbungshinweise.pdf`
                : `PLU-Liste_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
          )
        }
        clearTimeout(safetyTimeout)
        setTimeout(cleanupIframe, 30_000)
        onOpenChange(false)
      }
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsGenerating(false)
    }
  }, [
    items,
    kwLabel,
    displayMode,
    sortMode,
    flowDirection,
    blocks,
    obstStoreBlockOrder,
    fontSizes,
    exportMode,
    onOpenChange,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,720px)] w-[calc(100%-1rem)] max-w-[min(560px,calc(100vw-1rem))] flex-col gap-2 overflow-hidden p-3 sm:max-w-[540px] sm:gap-3 sm:p-5">
        <DialogHeader className="shrink-0 space-y-0.5 text-left sm:space-y-1">
          <DialogTitle className="text-base sm:text-lg">PDF exportieren</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Vorschau und Layout vor dem Download.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-1 sm:space-y-3 sm:py-2">
          {/* KW-Auswahl (aktuelle KW vorausgewählt) */}
          {versions.length > 0 && selectedVersionId != null && onVersionChange && (
            <div className="space-y-1 sm:space-y-2">
              <label className="text-xs font-medium sm:text-sm">Kalenderwoche für PDF</label>
              <KWSelector
                versions={versions}
                selectedId={selectedVersionId}
                onSelect={onVersionChange}
                disabled={isGenerating}
                showWeekMonSat={showWeekMonSat}
              />
            </div>
          )}

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-medium sm:text-sm">Inhalt</label>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
              <RadioCard
                selected={primaryExport === 'full'}
                onClick={() => setPrimaryExport('full')}
                title={
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <LayoutList className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" aria-hidden />
                    Volle Liste
                  </span>
                }
                description="Alle Artikel; optional mit oder ohne Angebots-Hinweise."
              />
              <RadioCard
                selected={primaryExport === 'offers_only'}
                onClick={() => canExportOffers && setPrimaryExport('offers_only')}
                title={
                  <span className="flex items-center gap-1.5 sm:gap-2">
                    <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" aria-hidden />
                    Nur Angebote
                  </span>
                }
                description="Nur Angebotszeilen, A–Z, eigener Titel."
              />
            </div>
            {primaryExport === 'full' && (
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-2 sm:space-y-2 sm:p-3">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">Volle Liste</p>
                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                  <RadioCard
                    selected={fullListVariant === 'with_offers'}
                    onClick={() => setFullListVariant('with_offers')}
                    title={
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <span className="inline-flex items-center gap-0.5" aria-hidden>
                          <LayoutList className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                          <Megaphone className="h-3.5 w-3.5 shrink-0 text-red-800 sm:h-4 sm:w-4" />
                        </span>
                        Mit Angeboten
                      </span>
                    }
                    description="Wie Hauptliste inkl. Werbung (Megafon, Aktionspreis)."
                  />
                  <RadioCard
                    selected={fullListVariant === 'without_offers'}
                    onClick={() => setFullListVariant('without_offers')}
                    title={
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <ListMinus className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" aria-hidden />
                        Ohne Angebots-Hinweise
                      </span>
                    }
                    description="Alle Artikel; ohne Megafon und ohne hervorgehobenen Aktionspreis."
                  />
                </div>
              </div>
            )}
            {primaryExport === 'offers_only' && !canExportOffers && (
              <p className="text-xs text-amber-700">Keine Angebote in der Liste – wähle „Volle Liste“.</p>
            )}
          </div>

          {/* Vorschau-Infos */}
          <div className="space-y-1.5 rounded-lg border border-border p-2 sm:space-y-2 sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium sm:text-sm">{kwLabel}</span>
              <span className="text-right text-xs text-muted-foreground sm:text-sm">
                {exportMode === 'offers_only'
                  ? `${offerCount} Angebote`
                  : exportMode === 'full_without_offers'
                    ? `${stats.total} Artikel (ohne Werbungshinweise)`
                    : `${stats.total} Artikel`}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {stats.newCount > 0 && (
                <Badge variant="secondary" className="bg-plu-new-bg text-plu-new-text border-0 text-[10px] sm:text-xs">
                  {stats.newCount} Neue
                </Badge>
              )}
              {stats.changedCount > 0 && (
                <Badge variant="secondary" className="bg-plu-changed-bg text-plu-changed-text border-0 text-[10px] sm:text-xs">
                  {stats.changedCount} PLU geändert
                </Badge>
              )}
              {stats.customCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 text-[10px] sm:text-xs">
                  {stats.customCount} Eigene
                </Badge>
              )}
            </div>

            {stats.hidden > 0 && (
              <p className="text-[11px] text-muted-foreground sm:text-xs">{stats.hidden} ausgeblendet (nicht im PDF)</p>
            )}
          </div>

          {/* Layout-Infos */}
          <div className="space-y-0.5 text-[11px] text-muted-foreground sm:space-y-1 sm:text-xs">
            <p>Sortierung: {sortMode === 'ALPHABETICAL' ? 'Alphabetisch' : 'Nach Warengruppe'}</p>
            <p>Darstellung: {displayMode === 'MIXED' ? 'Gemischt' : 'Getrennt (Stück/Gewicht)'}</p>
            <p>Fluss: {flowDirection === 'ROW_BY_ROW' ? 'Zeilenweise' : 'Spaltenweise'}</p>
          </div>
        </div>

        <DialogFooter className="!flex-row flex-wrap justify-end gap-1.5 border-t border-border pt-2 sm:gap-2 sm:pt-3 shrink-0">
          <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handlePrint}
            disabled={
              isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)
            }
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5 mr-1.5" />
            )}
            Drucken
          </Button>
          <Button
            size="sm"
            className="shrink-0"
            onClick={handleDownload}
            disabled={isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Erstelle PDF...
              </>
            ) : (
              <>
                <FileDown className="h-3.5 w-3.5 mr-1.5" />
                PDF herunterladen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
