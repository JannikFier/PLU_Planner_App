// Eine KW: Werbeartikel mit Bild, Preisen, Bestellfeldern, Strichcode

import { useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useBackshopWerbungLinesWithMaster } from '@/hooks/useBackshopWerbungLinesWithMaster'
import { useBackshopWerbungWeekdayQuantitiesMap } from '@/hooks/useBackshopWerbungWeekdayQuantities'
import { BackshopWerbungKwDetailContent } from '@/components/backshop-werbung/BackshopWerbungKwDetailContent'
import { getBackshopWerbungRolePrefix } from '@/lib/backshop-werbung-routes'
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

  if (!valid) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Ungültige Kalenderwoche.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to={`${prefix}/backshop-werbung`}>Zur Übersicht</Link>
        </Button>
      </DashboardLayout>
    )
  }

  const loading = werbung.isLoading || weekdayQuery.isLoading

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-none">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Werbung {titleKw}
          </h2>
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
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default BackshopWerbungKwDetailPage
