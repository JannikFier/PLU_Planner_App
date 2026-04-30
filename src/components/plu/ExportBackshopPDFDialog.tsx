// ExportBackshopPDFDialog: Dialog zum PDF-Export der Backshop-PLU-Liste (Bild → PLU → Name)

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileDown, LayoutList, ListMinus, Loader2, Megaphone, Printer } from 'lucide-react'
import {
  generateBackshopPDF,
  backshopPdfOffersOnlyHasRows,
  type PdfExportContentMode,
} from '@/lib/pdf-generator'
import { toast } from 'sonner'
import { KWSelector } from '@/components/plu/KWSelector'
import { RadioCard } from '@/components/ui/radio-card'
import type { DisplayItem } from '@/types/plu'
import type { Block, BackshopVersion } from '@/types/database'
import { usePromoteAllBackshopOfferSheetTests } from '@/hooks/useBackshopCustomProducts'

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
  /** KW-Dropdown: Mo–Sa zur ISO-KW (Layout-Einstellung). */
  showWeekMonSat?: boolean
}

function hasOfferSheetTestItems(list: DisplayItem[]): boolean {
  return list.some((i) => Boolean(i.is_custom && i.backshop_offer_sheet_test))
}

/** Nach DB-Promote: PDF mit aktualisiertem Test-Flag (Props können noch alt sein). */
function mapItemsAfterPromoteForPdf(list: DisplayItem[]): DisplayItem[] {
  return list.map((i) =>
    i.is_custom && i.backshop_offer_sheet_test ? { ...i, backshop_offer_sheet_test: false } : i,
  )
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
  showWeekMonSat = false,
}: ExportBackshopPDFDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  /** Oberwahl: volle Liste vs. nur Angebote */
  const [primaryExport, setPrimaryExport] = useState<'full' | 'offers_only'>('full')
  /** Bei voller Liste: mit oder ohne Angebotszeilen */
  const [fullListVariant, setFullListVariant] = useState<'with_offers' | 'without_offers'>('with_offers')
  const [promotePromptOpen, setPromotePromptOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'download' | 'print' | null>(null)

  const promoteAllMutation = usePromoteAllBackshopOfferSheetTests()
  const isGenerating = isDownloading || isPrinting || promoteAllMutation.isPending

  const exportMode: PdfExportContentMode =
    primaryExport === 'offers_only'
      ? 'offers_only'
      : fullListVariant === 'without_offers'
        ? 'full_without_offers'
        : 'full_with_offers'

  const canExportOffers = backshopPdfOffersOnlyHasRows(items)

  const { campaignOfferRowCount, testOwnRowCount } = useMemo(
    () => ({
      campaignOfferRowCount: items.filter(
        (i) => Boolean(i.is_offer) && !(i.is_custom && i.backshop_offer_sheet_test),
      ).length,
      testOwnRowCount: items.filter((i) => Boolean(i.is_custom && i.backshop_offer_sheet_test)).length,
    }),
    [items],
  )

  const offersOnlySummaryLabel = useMemo(() => {
    if (campaignOfferRowCount > 0 && testOwnRowCount > 0) {
      return `${campaignOfferRowCount} Angebote, ${testOwnRowCount} neue Produkte`
    }
    if (testOwnRowCount > 0) return `${testOwnRowCount} neue Produkte`
    return `${campaignOfferRowCount} Angebote`
  }, [campaignOfferRowCount, testOwnRowCount])

  const runPdfExport = useCallback(
    async (action: 'download' | 'print', promoteTests: boolean) => {
      const setBusy = action === 'download' ? setIsDownloading : setIsPrinting
      setBusy(true)
      try {
        if (promoteTests) {
          await promoteAllMutation.mutateAsync()
        }
        const pdfItems = promoteTests ? mapItemsAfterPromoteForPdf(items) : items
        const doc = await generateBackshopPDF({
          items: pdfItems,
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

        if (action === 'download') {
          doc.save(fileName)
          toast.success('PDF heruntergeladen')
          onOpenChange(false)
        } else {
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
              doc.save(fileName)
            }
            clearTimeout(safetyTimeout)
            setTimeout(cleanupIframe, 30_000)
            onOpenChange(false)
          }
        }
      } catch {
        toast.error('Fehler beim Erstellen des PDFs')
      } finally {
        setBusy(false)
      }
    },
    [
      items,
      kwLabel,
      sortMode,
      flowDirection,
      blocks,
      fontSizes,
      exportMode,
      onOpenChange,
      promoteAllMutation,
    ],
  )

  const requestDownload = useCallback(() => {
    if (exportMode === 'offers_only' && !canExportOffers) return
    if (primaryExport === 'full' && hasOfferSheetTestItems(items)) {
      setPendingAction('download')
      setPromotePromptOpen(true)
      return
    }
    void runPdfExport('download', false)
  }, [exportMode, canExportOffers, primaryExport, items, runPdfExport])

  const requestPrint = useCallback(() => {
    if (exportMode === 'offers_only' && !canExportOffers) return
    if (primaryExport === 'full' && hasOfferSheetTestItems(items)) {
      setPendingAction('print')
      setPromotePromptOpen(true)
      return
    }
    void runPdfExport('print', false)
  }, [exportMode, canExportOffers, primaryExport, items, runPdfExport])

  const closePromotePrompt = useCallback(() => {
    setPromotePromptOpen(false)
    setPendingAction(null)
  }, [])

  const onPromoteDialogNo = useCallback(async () => {
    const a = pendingAction
    closePromotePrompt()
    if (a) await runPdfExport(a, false)
  }, [pendingAction, closePromotePrompt, runPdfExport])

  const onPromoteDialogYes = useCallback(async () => {
    const a = pendingAction
    closePromotePrompt()
    if (a) await runPdfExport(a, true)
  }, [pendingAction, closePromotePrompt, runPdfExport])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92dvh,720px)] w-[calc(100%-1rem)] max-w-[min(560px,calc(100vw-1rem))] flex-col gap-3 overflow-hidden p-4 sm:max-w-[540px] sm:gap-4 sm:p-6">
          <DialogHeader className="shrink-0 space-y-1.5 text-left">
            <DialogTitle className="text-base leading-tight sm:text-lg">PDF exportieren (Backshop)</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed sm:text-sm">
              PDF mit Bild, PLU und Name – laden oder drucken.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-0.5 sm:space-y-4 sm:py-1">
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
                  description="Angebotszeilen und ggf. neue Produkte (Test), A–Z, eigener Titel."
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
                <p className="text-xs text-amber-700">Keine Angebote oder Test-Produkte – wähle „Volle Liste“.</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 sm:space-y-2.5 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-semibold text-foreground sm:text-sm">{kwLabel}</span>
                <span className="text-right text-xs leading-snug text-muted-foreground sm:text-sm">
                  {exportMode === 'offers_only'
                    ? offersOnlySummaryLabel
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

            <div className="space-y-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
              <p className="m-0">Sortierung: {sortMode === 'ALPHABETICAL' ? 'Alphabetisch' : 'Nach Warengruppe'}</p>
              <p className="m-0">PDF: Bild → PLU → Name</p>
            </div>
          </div>

          <DialogFooter className="!flex-row flex-wrap justify-end gap-2 border-t border-border pt-3 sm:gap-3 sm:pt-4 shrink-0">
            <Button variant="outline" size="sm" className="min-h-9 shrink-0" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 shrink-0"
              onClick={requestPrint}
              disabled={
                isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)
              }
            >
              {isPrinting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isPrinting ? 'Wird erstellt…' : 'Drucken'}
            </Button>
            <Button
              size="sm"
              className="min-h-9 shrink-0"
              onClick={requestDownload}
              disabled={isGenerating || items.length === 0 || (exportMode === 'offers_only' && !canExportOffers)}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Erstelle PDF…
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

      {/* Nach dem PDF-Dialog mounten, damit Overlay/Panel sicher über dem Dialog liegt */}
      <AlertDialog open={promotePromptOpen} onOpenChange={(o) => !o && closePromotePrompt()}>
        <AlertDialogContent
          data-testid="backshop-full-pdf-promote-prompt"
          className="z-[100] max-w-[min(20rem,calc(100vw-1.5rem))] gap-0 overflow-hidden border-border p-0 shadow-2xl sm:max-w-sm"
        >
          <div className="border-b border-border bg-muted/40 px-5 py-4 sm:px-6 sm:py-4">
            <AlertDialogHeader className="gap-0 space-y-0 text-left sm:place-items-start sm:text-left">
              <AlertDialogTitle className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
                Eigene Produkte übernehmen?
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>
          <div className="px-5 py-4 sm:px-6 sm:py-5">
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm leading-relaxed text-muted-foreground">
                <p className="m-0">
                  Wenn du die volle Liste jetzt exportierst: Sollen alle eigenen Produkte, die noch als{' '}
                  <span className="font-medium text-foreground">„Test“</span> (auf dem Angebotszettel)
                  markiert sind, in die Hauptliste übernommen werden?
                </p>
                <p className="m-0 text-[13px] sm:text-sm">
                  Sie bleiben auf dem PDF sichtbar, gelten danach aber nicht mehr als Test auf dem
                  Angebotszettel.
                </p>
              </div>
            </AlertDialogDescription>
          </div>
          <div
            className="flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:px-6 sm:py-4"
            role="group"
            aria-label="Aktionen"
          >
            <AlertDialogCancel
              disabled={isGenerating}
              className="m-0 h-10 w-full shrink-0 border-border"
              title="Dialog schließen, kein PDF"
            >
              Abbrechen
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              className="h-10 w-full shrink-0 border-border"
              title="PDF wie gewohnt; Test-Produkte bleiben auf dem Angebotszettel markiert"
              onClick={() => void onPromoteDialogNo()}
            >
              Nur exportieren
            </Button>
            <Button
              type="button"
              disabled={isGenerating}
              className="h-10 w-full shrink-0"
              title="Alle Test-Produkte fest in die Hauptliste übernehmen, danach PDF"
              onClick={() => void onPromoteDialogYes()}
            >
              Übernehmen & exportieren
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
