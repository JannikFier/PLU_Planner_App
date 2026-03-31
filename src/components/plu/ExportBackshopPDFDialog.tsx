// ExportBackshopPDFDialog: Dialog zum PDF-Export der Backshop-PLU-Liste (Bild → PLU → Name)

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
import { generateBackshopPDF, type PdfExportContentMode } from '@/lib/pdf-generator'
import { toast } from 'sonner'
import { KWSelector } from '@/components/plu/KWSelector'
import { RadioCard } from '@/components/ui/radio-card'
import type { DisplayItem } from '@/types/plu'
import type { Block, BackshopVersion } from '@/types/database'

interface ExportBackshopPDFDialogProps {
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
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  flowDirection: 'ROW_BY_ROW' | 'COLUMN_FIRST'
  blocks: Block[]
  versions?: BackshopVersion[]
  selectedVersionId?: string
  onVersionChange?: (versionId: string) => void
  fontSizes?: { header: number; column: number; product: number }
}

/**
 * Dialog für Backshop-PDF-Export: KW wählbar, Download/Druck mit Bild → PLU → Name.
 */
export function ExportBackshopPDFDialog({
  open,
  onOpenChange,
  items,
  stats,
  kwLabel,
  sortMode,
  flowDirection,
  blocks,
  versions = [],
  selectedVersionId,
  onVersionChange,
  fontSizes,
}: ExportBackshopPDFDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  /** Oberwahl: volle Liste vs. nur Angebote */
  const [primaryExport, setPrimaryExport] = useState<'full' | 'offers_only'>('full')
  /** Bei voller Liste: mit oder ohne Angebotszeilen */
  const [fullListVariant, setFullListVariant] = useState<'with_offers' | 'without_offers'>('with_offers')
  const isGenerating = isDownloading || isPrinting

  const offerCount = items.filter((i) => i.is_offer).length
  const canExportOffers = offerCount > 0

  const exportMode: PdfExportContentMode =
    primaryExport === 'offers_only'
      ? 'offers_only'
      : fullListVariant === 'without_offers'
        ? 'full_without_offers'
        : 'full_with_offers'

  const handleDownload = useCallback(async () => {
    setIsDownloading(true)
    try {
      const doc = await generateBackshopPDF({
        items,
        kwLabel,
        sortMode,
        flowDirection,
        blocks,
        fontSizes,
        exportMode,
      })
      const safeLabel = kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName =
        exportMode === 'offers_only'
          ? `Angebote_Backshop_${safeLabel}.pdf`
          : exportMode === 'full_without_offers'
            ? `PLU-Liste-Backshop_${safeLabel}_ohne-Werbungshinweise.pdf`
            : `PLU-Liste-Backshop_${safeLabel}.pdf`
      doc.save(fileName)
      toast.success('PDF heruntergeladen')
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsDownloading(false)
    }
  }, [items, kwLabel, sortMode, flowDirection, blocks, fontSizes, exportMode, onOpenChange])

  const handlePrint = useCallback(async () => {
    setIsPrinting(true)
    try {
      const doc = await generateBackshopPDF({
        items,
        kwLabel,
        sortMode,
        flowDirection,
        blocks,
        fontSizes,
        exportMode,
      })
      // Kein doc.autoPrint() – löst auf Mac einen zweiten Druckdialog aus. Nur iframe.contentWindow.print() nutzen.
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
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
              ? `Angebote_Backshop_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
              : exportMode === 'full_without_offers'
                ? `PLU-Liste-Backshop_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_ohne-Werbungshinweise.pdf`
                : `PLU-Liste-Backshop_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
          )
        }
        clearTimeout(safetyTimeout)
        setTimeout(cleanupIframe, 30_000)
        onOpenChange(false)
      }
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsPrinting(false)
    }
  }, [items, kwLabel, sortMode, flowDirection, blocks, fontSizes, exportMode, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] sm:min-w-[520px]">
        <DialogHeader>
          <DialogTitle>PDF exportieren (Backshop)</DialogTitle>
          <DialogDescription>
            PLU-Liste Backshop mit Bild, PLU und Name als PDF herunterladen oder drucken.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {versions.length > 0 && selectedVersionId != null && onVersionChange && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Kalenderwoche für PDF</label>
              <KWSelector
                versions={versions as import('@/types/database').Version[]}
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
              <p className="text-xs text-muted-foreground">{stats.hidden} ausgeblendet (nicht im PDF)</p>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Sortierung: {sortMode === 'ALPHABETICAL' ? 'Alphabetisch' : 'Nach Warengruppe'}</p>
            <p>Reihenfolge im PDF: Bild → PLU → Name</p>
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
            {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            {isPrinting ? 'Wird erstellt…' : 'Drucken'}
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Erstelle PDF…
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
