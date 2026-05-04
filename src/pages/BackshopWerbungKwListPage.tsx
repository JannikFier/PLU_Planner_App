// Kalenderwochen mit zentraler Backshop-Werbung (Bestellhilfe)

import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBackshopOfferCampaignsAdminList } from '@/hooks/useCentralOfferCampaigns'
import type { BackshopOfferCampaignAdminSummary } from '@/hooks/useCentralOfferCampaigns'
import { getBackshopWerbungRolePrefix } from '@/lib/backshop-werbung-routes'
import { partitionCampaignsForBackshopWerbungKwList } from '@/lib/backshop-werbung-kw-list-sort'
import { formatAuslieferungCountdownOneLine } from '@/lib/auslieferung-countdown'
import { formatKWLabel } from '@/lib/plu-helpers'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function KwCampaignRow({
  c,
  prefix,
  navigate,
  preserveSearch,
  highlight,
}: {
  c: BackshopOfferCampaignAdminSummary
  prefix: string
  navigate: ReturnType<typeof useNavigate>
  /** Query (?backTo=…) vom Werbungs-Überblick auf die KW-Detailseite mitnehmen */
  preserveSearch: string
  highlight?: 'current'
}) {
  const auslieferungLine = formatAuslieferungCountdownOneLine(c.auslieferung_ab)
  return (
    <li>
      <button
        type="button"
        className="w-full text-left rounded-lg border bg-card p-4 shadow-sm hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
        onClick={() =>
          navigate(`${prefix}/backshop-werbung/${c.kw_nummer}/${c.jahr}${preserveSearch}`)
        }
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{formatKWLabel(c.kw_nummer, c.jahr)}</p>
            {highlight === 'current' && (
              <Badge variant="default" className="shrink-0 text-xs font-normal">
                Aktuelle Woche
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {c.assigned_lines} Artikel
            {c.source_file_name ? ` · ${c.source_file_name}` : ''}
          </p>
          {auslieferungLine && (
            <p className="text-xs text-muted-foreground mt-1">{auslieferungLine}</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  )
}

export function BackshopWerbungKwListPage({ embedded = false }: { embedded?: boolean } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefix = getBackshopWerbungRolePrefix(location.pathname)
  const [pastOpen, setPastOpen] = useState(false)

  const { data: campaigns = [], isLoading } = useBackshopOfferCampaignsAdminList()

  const buckets = useMemo(() => {
    const filtered = campaigns.filter((c) => c.assigned_lines > 0)
    return partitionCampaignsForBackshopWerbungKwList(filtered)
  }, [campaigns])

  const hasAny =
    buckets.current != null || buckets.future.length > 0 || buckets.past.length > 0

  const preserveSearch = location.search

  const body = (
    <div className={cn('space-y-6', !embedded && 'max-w-7xl')}>
        {!embedded && (
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Werbung bestellen</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Kalenderwoche wählen – Artikel, Preise und Strichcode aus der zentralen Werbung für diesen
            Markt.
          </p>
        </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : !hasAny ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Es liegt noch keine zentrale Backshop-Werbung vor (oder keine zugeordneten Artikel).
              Sobald die Zentrale eine Werbung für eine KW hochlädt, erscheint sie hier.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8" data-testid="backshop-werbung-kw-list">
            {buckets.current && (
              <section aria-labelledby="kw-section-current">
                <h3 id="kw-section-current" className="text-sm font-semibold text-muted-foreground mb-3">
                  Aktuelle Woche
                </h3>
                <ul className="space-y-3">
                  <KwCampaignRow
                    c={buckets.current}
                    prefix={prefix}
                    navigate={navigate}
                    preserveSearch={preserveSearch}
                    highlight="current"
                  />
                </ul>
              </section>
            )}

            {!buckets.current &&
              hasAny &&
              (buckets.future.length > 0 || buckets.past.length > 0) && (
                <p className="text-sm text-muted-foreground rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                  Für die aktuelle Kalenderwoche ({formatKWLabel(buckets.refKw, buckets.refYear)}) liegt
                  keine zentrale Werbung vor. Unten siehst du kommende und – ausklappbar – frühere KWs.
                </p>
              )}

            {buckets.future.length > 0 && (
              <section aria-labelledby="kw-section-future">
                <h3 id="kw-section-future" className="text-sm font-semibold text-muted-foreground mb-3">
                  Kommende Kalenderwochen
                </h3>
                <ul className="space-y-3">
                    {buckets.future.map((c) => (
                    <KwCampaignRow
                      key={c.id}
                      c={c}
                      prefix={prefix}
                      navigate={navigate}
                      preserveSearch={preserveSearch}
                    />
                  ))}
                </ul>
              </section>
            )}

            {buckets.past.length > 0 && (
              <section aria-labelledby="kw-section-past" className="rounded-lg border bg-card">
                <button
                  type="button"
                  id="kw-section-past"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                  onClick={() => setPastOpen((o) => !o)}
                  aria-expanded={pastOpen}
                >
                  <span className="text-sm font-semibold text-foreground">
                    Frühere Werbe-Kalenderwochen
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      (letzte {buckets.past.length})
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                      pastOpen && 'rotate-180',
                    )}
                    aria-hidden
                  />
                </button>
                {pastOpen && (
                  <ul className="space-y-3 border-t px-4 py-3">
                    {buckets.past.map((c) => (
                      <KwCampaignRow
                        key={c.id}
                        c={c}
                        prefix={prefix}
                        navigate={navigate}
                        preserveSearch={preserveSearch}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>
  )

  if (embedded) return body

  return <DashboardLayout>{body}</DashboardLayout>
}

export default BackshopWerbungKwListPage
