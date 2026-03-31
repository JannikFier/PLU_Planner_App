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
import type { Block, Version } from '@/types/database'

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
  /** Optionale KW-Auswahl: Liste der Versionen, aktuelle Auswahl, Callback */
  versions?: Version[]
  selectedVersionId?: string
  onVersionChange?: (versionId: string) => void
  /** Schriftgrößen aus Layout-Einstellungen (Überschrift, PLU-Artikel, Produkte) */
  fontSizes?: { header: number; column: number; product: number }
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
  versions = [],
  selectedVersionId,
  onVersionChange,
  fontSizes,
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
  }, [items, kwLabel, displayMode, sortMode, flowDirection, blocks, fontSizes, exportMode, onOpenChange])

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
  }, [items, kwLabel, displayMode, sortMode, flowDirection, blocks, fontSizes, exportMode, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] sm:min-w-[520px]">
        <DialogHeader>
          <DialogTitle>PDF exportieren</DialogTitle>
          <DialogDescription>
            Vorschau und Layout-Infos vor dem Herunterladen.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* KW-Auswahl (aktuelle KW vorausgewählt) */}
          {versions.length > 0 && selectedVersionId != null && onVersionChange && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Kalenderwoche für PDF</label>
              <KWSelector
                versions={versions}
                selectedId={selectedVersionId}
                onSelect={onVersionChange}
                disabled={isGenerating}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Inhalt</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <RadioCard
                selected={primaryExport === 'full'}
                onClick={() => setPrimaryExport('full')}
                title={
                  <span className="flex items-center gap-2">
                    <LayoutList className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    Volle Liste
                  </span>
                }
                description="Alle sichtbaren Artikel; darunter mit oder ohne Angebots-Hinweise (Megafon, hervorgehobener Preis)."
              />
              <RadioCard
                selected={primaryExport === 'offers_only'}
                onClick={() => canExportOffers && setPrimaryExport('offers_only')}
                title={
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    Nur Angebote
                  </span>
                }
                description="Nur Werbe-/Angebotszeilen, alphabetisch, ein eigener Titel."
              />
            </div>
            {primaryExport === 'full' && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Volle Liste</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <RadioCard
                    selected={fullListVariant === 'with_offers'}
                    onClick={() => setFullListVariant('with_offers')}
                    title={
                      <span className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1" aria-hidden>
                          <LayoutList className="h-4 w-4 shrink-0 text-primary" />
                          <Megaphone className="h-4 w-4 shrink-0 text-red-800" />
                        </span>
                        Mit Angeboten
                      </span>
                    }
                    description="Wie in der Hauptliste – inkl. Werbung (Megafon, Aktionspreis)."
                  />
                  <RadioCard
                    selected={fullListVariant === 'without_offers'}
                    onClick={() => setFullListVariant('without_offers')}
                    title={
                      <span className="flex items-center gap-2">
                        <ListMinus className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        Ohne Angebots-Hinweise
                      </span>
                    }
                    description="Alle Artikel wie in der Liste; ohne Megafon und ohne hervorgehobenen Aktionspreis."
                  />
                </div>
              </div>
            )}
            {primaryExport === 'offers_only' && !canExportOffers && (
              <p className="text-xs text-amber-700">Keine Angebote in der Liste – wähle „Volle Liste“.</p>
            )}
          </div>

          {/* Vorschau-Infos */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{kwLabel}</span>
              <span className="text-sm text-muted-foreground">
                {exportMode === 'offers_only'
                  ? `${offerCount} Angebote`
                  : exportMode === 'full_without_offers'
                    ? `${stats.total} Artikel (ohne Werbungshinweise)`
                    : `${stats.total} Artikel`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stats.newCount > 0 && (
                <Badge variant="secondary" className="bg-plu-new-bg text-plu-new-text border-0 text-xs">
                  {stats.newCount} Neue
                </Badge>
              )}
              {stats.changedCount > 0 && (
                <Badge variant="secondary" className="bg-plu-changed-bg text-plu-changed-text border-0 text-xs">
                  {stats.changedCount} PLU geändert
                </Badge>
              )}
              {stats.customCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-0 text-xs">
                  {stats.customCount} Eigene
                </Badge>
              )}
            </div>

            {stats.hidden > 0 && (
              <p className="text-xs text-muted-foreground">
                {stats.hidden} ausgeblendet (nicht im PDF)
              </p>
            )}
          </div>

          {/* Layout-Infos */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Sortierung: {sortMode === 'ALPHABETICAL' ? 'Alphabetisch' : 'Nach Warengruppe'}</p>
            <p>Darstellung: {displayMode === 'MIXED' ? 'Gemischt' : 'Getrennt (Stück/Gewicht)'}</p>
            <p>Flussrichtung: {flowDirection === 'ROW_BY_ROW' ? 'Zeilenweise' : 'Spaltenweise'}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={
              isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)
            }
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Drucken
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Erstelle PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                PDF herunterladen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
