// Eine KW: Werbeartikel mit Bild, Preisen, Bestellfeldern, Strichcode

import { useCallback, useMemo, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useBackshopWerbungLinesWithMaster } from '@/hooks/useBackshopWerbungLinesWithMaster'
import { useBackshopWerbungWeekdayQuantitiesMap } from '@/hooks/useBackshopWerbungWeekdayQuantities'
import { BackshopWerbungKwDetailContent } from '@/components/backshop-werbung/BackshopWerbungKwDetailContent'
import { getBackshopWerbungRolePrefix } from '@/lib/backshop-werbung-routes'
import {
  buildBackshopWerbungOrderPdfFileName,
  generateBackshopWerbungOrderPdf,
} from '@/lib/backshop-werbung-order-pdf'
import { formatAuslieferungCountdown } from '@/lib/auslieferung-countdown'
import { formatKWLabel } from '@/lib/plu-helpers'
import { cn } from '@/lib/utils'

export function BackshopWerbungKwDetailPage() {
  const params = useParams<{ kw: string; jahr: string }>()
  const location = useLocation()
  const prefix = getBackshopWerbungRolePrefix(location.pathname)

  const kw = Number(params.kw)
  const jahr = Number(params.jahr)

  const valid = Number.isFinite(kw) && Number.isFinite(jahr) && kw >= 1 && kw <= 53

  const { isViewer } = useAuth()

  const werbung = useBackshopWerbungLinesWithMaster(valid ? kw : null, valid ? jahr : null)
  const weekdayQuery = useBackshopWerbungWeekdayQuantitiesMap(
    valid ? kw : null,
    valid ? jahr : null,
    valid,
  )

  const titleKw = valid ? formatKWLabel(kw, jahr) : ''

  const auslieferungInfo = useMemo(
    () => formatAuslieferungCountdown(werbung.campaignMeta?.auslieferung_ab ?? null),
    [werbung.campaignMeta?.auslieferung_ab],
  )

  const [pdfBusy, setPdfBusy] = useState(false)

  const onExportPdf = useCallback(async () => {
    if (werbung.isLoading || weekdayQuery.isLoading || werbung.resolvedLines.length === 0) return
    setPdfBusy(true)
    const notice = toast.loading('PDF wird erstellt…')
    try {
      const doc = await generateBackshopWerbungOrderPdf(
        werbung.resolvedLines,
        {
          kw,
          jahr,
          source_file_name: werbung.campaignMeta?.source_file_name,
          auslieferung_ab: werbung.campaignMeta?.auslieferung_ab,
        },
        weekdayQuery.data ?? new Map(),
      )
      doc.save(buildBackshopWerbungOrderPdfFileName(kw, jahr))
      toast.success('PDF wurde heruntergeladen.', { id: notice })
    } catch (e) {
      console.error(e)
      toast.error('PDF konnte nicht erstellt werden.', { id: notice })
    } finally {
      setPdfBusy(false)
    }
  }, [
    jahr,
    kw,
    werbung.campaignMeta?.auslieferung_ab,
    werbung.campaignMeta?.source_file_name,
    werbung.isLoading,
    werbung.resolvedLines,
    weekdayQuery.data,
    weekdayQuery.isLoading,
  ])

  if (!valid) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Ungültige Kalenderwoche.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to={`${prefix}/backshop-werbung${location.search}`}>Zur Übersicht</Link>
        </Button>
      </DashboardLayout>
    )
  }

  const loading = werbung.isLoading || weekdayQuery.isLoading

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Werbung {titleKw}</h2>
            {werbung.campaignMeta?.source_file_name && (
              <p className="text-xs text-muted-foreground mt-1">
                Datei: {werbung.campaignMeta.source_file_name}
              </p>
            )}
            {auslieferungInfo && (
              <div
                className={cn(
                  'mt-3 rounded-md border px-3 py-2.5 text-sm max-w-xl',
                  auslieferungInfo.primary === 'Auslieferung heute'
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/60 bg-muted/25',
                )}
              >
                <p
                  className={cn(
                    'font-medium text-foreground',
                    auslieferungInfo.primary === 'Auslieferung heute' && 'text-primary',
                  )}
                >
                  {auslieferungInfo.primary}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{auslieferungInfo.secondary}</p>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="default"
            className="shrink-0 w-full sm:w-auto"
            disabled={loading || werbung.resolvedLines.length === 0 || pdfBusy}
            onClick={onExportPdf}
          >
            {pdfBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden />
            )}
            PDF exportieren
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <BackshopWerbungKwDetailContent
            kw={kw}
            jahr={jahr}
            lines={werbung.resolvedLines}
            weekdayMap={weekdayQuery.data ?? new Map()}
            readOnlyWeekdays={isViewer}
            customProductsListPath={`${prefix}/backshop-custom-products`}
            showAddCustomProductLink={!isViewer}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default BackshopWerbungKwDetailPage
