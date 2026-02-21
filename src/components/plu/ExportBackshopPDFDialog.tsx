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
import { FileDown, Loader2, Printer } from 'lucide-react'
import { generateBackshopPDF } from '@/lib/pdf-generator'
import { toast } from 'sonner'
import { KWSelector } from '@/components/plu/KWSelector'
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
  pageBreakPerBlock?: boolean
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
  pageBreakPerBlock = false,
}: ExportBackshopPDFDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const isGenerating = isDownloading || isPrinting

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
        pageBreakPerBlock,
      })
      const safeLabel = kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
      doc.save(`PLU-Liste-Backshop_${safeLabel}.pdf`)
      toast.success('PDF heruntergeladen')
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsDownloading(false)
    }
  }, [items, kwLabel, sortMode, flowDirection, blocks, fontSizes, pageBreakPerBlock, onOpenChange])

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
        pageBreakPerBlock,
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
      iframe.onload = () => {
        try {
          // Einziger Druckdialog – kein autoPrint, damit auf Mac nur ein Fenster erscheint
          iframe.contentWindow?.print()
          toast.success('Druckdialog geöffnet')
        } catch {
          toast.info('PDF heruntergeladen – öffne es und drucke mit Strg+P')
          doc.save(`PLU-Liste-Backshop_${kwLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`)
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 30_000)
      }
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Erstellen des PDFs')
    } finally {
      setIsPrinting(false)
    }
  }, [items, kwLabel, sortMode, flowDirection, blocks, fontSizes, pageBreakPerBlock, onOpenChange])

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

          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{kwLabel}</span>
              <span className="text-sm text-muted-foreground">{stats.total} Artikel</span>
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
            disabled={isGenerating || items.length === 0}
          >
            {isPrinting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            {isPrinting ? 'Wird erstellt…' : 'Drucken'}
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating || items.length === 0}>
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
