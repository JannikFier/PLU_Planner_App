import { Navigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'
import { BackshopBereichNav } from '@/components/backshop/BackshopBereichNav'
import { BackshopWerbungKwListPage } from '@/pages/BackshopWerbungKwListPage'

/** Dashboard nach Rolle, wenn Backshop für den Markt ausgeblendet ist. */
function backshopHubFallbackPath(prefix: string): string {
  if (prefix === '/admin') return '/admin'
  if (prefix === '/viewer') return '/viewer'
  if (prefix === '/super-admin') return '/super-admin'
  return '/user'
}

/**
 * Backshop-Einstieg (User, Admin, Viewer): Navigation Werbung · Backshop-Liste · PLU-Liste · Konfiguration;
 * auf der Startseite des Bereichs: Kalenderwochen-Werbung wie bisher.
 */
export function BackshopHubPage() {
  const location = useLocation()
  const prefix = getBackshopNavPrefix(location.pathname)
  const { currentStoreId } = useCurrentStore()
  const { backshop: backshopVisible, isLoading } = useEffectiveListVisibility()

  if (!currentStoreId) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Kein Markt zugewiesen.</div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse bg-muted h-32 rounded-lg" />
      </DashboardLayout>
    )
  }

  if (!backshopVisible) {
    return <Navigate to={backshopHubFallbackPath(prefix)} replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="backshop-hub-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h2>
          <p className="text-muted-foreground mt-1">
            Werbung nach Kalenderwoche, Kachel-Übersicht ohne Werbungs-Artikel oder klassische PLU-Tabelle.
          </p>
        </div>

        <BackshopBereichNav />

        <BackshopWerbungKwListPage embedded />
      </div>
    </DashboardLayout>
  )
}
