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
import { FileDown, Loader2, Printer } from 'lucide-react'
import { generatePDF } from '@/lib/pdf-generator'
import { toast } from 'sonner'
import { KWSelector } from '@/components/plu/KWSelector'
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
      })

      const fileName = `PLU-Liste_${kwLabel.replace('/', '_')}.pdf`
      doc.save(fileName)
      toast.success('PDF heruntergeladen')
      onOpenChange(false)
    } catch (error) {
      toast.error('Fehler beim Erstellen des PDFs')
      console.error('PDF-Generierung fehlgeschlagen:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [items, kwLabel, displayMode, sortMode, flowDirection, blocks, fontSizes, onOpenChange])

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
      })

      doc.autoPrint()
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

      iframe.onload = () => {
        try {
          iframe.contentWindow?.print()
          toast.success('Druckdialog geöffnet')
        } catch {
          toast.info('PDF heruntergeladen – öffne es und drucke mit Strg+P')
          doc.save(`PLU-Liste_${kwLabel.replace('/', '_')}.pdf`)
        }
        setTimeout(() => {
          document.body.removeChild(iframe)
          URL.revokeObjectURL(url)
        }, 1000)
      }
      onOpenChange(false)
    } catch (error) {
      toast.error('Fehler beim Erstellen des PDFs')
      console.error('PDF-Generierung fehlgeschlagen:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [items, kwLabel, displayMode, sortMode, flowDirection, blocks, fontSizes, onOpenChange])

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

          {/* Vorschau-Infos */}
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
            disabled={isGenerating || items.length === 0}
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
            disabled={isGenerating || items.length === 0}
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
