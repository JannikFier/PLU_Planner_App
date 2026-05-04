// Backshop-Kachel-Katalog: gleiche Daten wie PLU-Tabelle, ohne Werbung, gruppiert nach Warengruppe

import { useMemo, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopMasterListDisplayBundle } from '@/hooks/useBackshopMasterListDisplayBundle'
import { buildBackshopKachelWarengruppeBlocks } from '@/lib/backshop-kachel-groups'
import { BackshopKachelGrid } from '@/components/backshop/BackshopKachelGrid'
import { BackshopBereichNav } from '@/components/backshop/BackshopBereichNav'
import {
  BackshopMasterListItemsErrorCard,
  BackshopMasterListLoadingSkeletonCard,
  BackshopMasterListNoVersionCard,
} from '@/components/plu/BackshopMasterListPageStates'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { formatKwLabelWithOptionalMonSatRange } from '@/lib/date-kw-utils'
import { toast } from 'sonner'

export function BackshopKachelCatalogPage() {
  const { storeName } = useCurrentStore()
  const bundle = useBackshopMasterListDisplayBundle()
  const {
    isLoading,
    hasNoVersion,
    snapshotInvalid,
    displayItems,
    itemsError,
    itemsRefetching,
    refetchItems,
    listVersion,
    showWeekMonSat,
    sourceArtNrByPlu,
  } = bundle

  const [pdfBusy, setPdfBusy] = useState(false)

  const standLabel = useMemo(
    () => format(new Date(), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de }),
    [],
  )

  const blocks = useMemo(
    () => buildBackshopKachelWarengruppeBlocks(displayItems, { excludeOffers: true }),
    [displayItems],
  )

  const totalTiles = useMemo(() => blocks.reduce((n, b) => n + b.items.length, 0), [blocks])

  const kwHint = useMemo(() => {
    if (!listVersion) return null
    return formatKwLabelWithOptionalMonSatRange(
      listVersion.kw_label,
      listVersion.kw_nummer,
      listVersion.jahr,
      showWeekMonSat,
    )
  }, [listVersion, showWeekMonSat])

  const handlePdf = useCallback(async () => {
    if (totalTiles === 0) return
    setPdfBusy(true)
    try {
      const { generateBackshopKachelCatalogPdf, buildBackshopKachelCatalogPdfFileName } = await import(
        '@/lib/backshop-kachel-catalog-pdf'
      )
      const standForPdf = format(new Date(), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })
      const blob = await generateBackshopKachelCatalogPdf({
        storeName: storeName ?? 'Markt',
        standLabel: standForPdf,
        kwHint,
        blocks,
        sourceArtNrByPlu,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildBackshopKachelCatalogPdfFileName(storeName)
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF wurde erstellt.')
    } catch (e) {
      console.error(e)
      toast.error('PDF konnte nicht erstellt werden.')
    } finally {
      setPdfBusy(false)
    }
  }, [blocks, kwHint, sourceArtNrByPlu, storeName, totalTiles])

  const pdfDisabled = isLoading || snapshotInvalid || hasNoVersion || totalTiles === 0 || pdfBusy

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackshopBereichNav />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop-Liste</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Stand: {standLabel}
              {storeName ? ` · ${storeName}` : ''}
              {kwHint ? ` · Liste ${kwHint}` : ''}
            </p>
            <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
              Übersicht ohne Werbungs-Artikel; Warengruppen wie in der Tabelle (Datenfeld oder Layout-Block). Der
              Strichcode nutzt die hinterlegte Artikelnummer als GTIN, sonst die PLU.
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            className="shrink-0 self-start"
            disabled={pdfDisabled}
            onClick={() => void handlePdf()}
          >
            {pdfBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                PDF wird erstellt…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                PDF erzeugen
              </>
            )}
          </Button>
        </div>

        {hasNoVersion && <BackshopMasterListNoVersionCard />}

        {(isLoading || (itemsError != null && itemsRefetching)) && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListLoadingSkeletonCard />
        )}

        {itemsError != null && !isLoading && !itemsRefetching && !hasNoVersion && !snapshotInvalid && (
          <BackshopMasterListItemsErrorCard
            message={itemsError instanceof Error ? itemsError.message : 'Unbekannter Fehler'}
            onRetry={() => refetchItems()}
          />
        )}

        {!isLoading && itemsError == null && !hasNoVersion && !snapshotInvalid && totalTiles === 0 && (
          <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 p-6 text-center">
            Keine Artikel ohne Werbung für die Anzeige vorhanden.
          </p>
        )}

        {!isLoading && itemsError == null && !hasNoVersion && !snapshotInvalid && totalTiles > 0 && (
          <BackshopKachelGrid blocks={blocks} sourceArtNrByPlu={sourceArtNrByPlu} />
        )}
      </div>
    </DashboardLayout>
  )
}
