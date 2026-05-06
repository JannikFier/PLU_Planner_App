import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutTemplate, Megaphone } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'

/** Dashboard nach Rolle, wenn Backshop für den Markt ausgeblendet ist. */
function backshopInhaltFallbackPath(prefix: string): string {
  if (prefix === '/admin') return '/admin'
  if (prefix === '/viewer') return '/viewer'
  if (prefix === '/super-admin') return '/super-admin'
  return '/user'
}

/**
 * Backshop – zweite Ebene (User, Admin, Viewer): Werbung (KW) oder Kachel-Übersicht;
 * analog Super-Admin Markt → Listen → Backshop → Inhalt.
 */
export function BackshopInhaltHubPage() {
  const navigate = useNavigate()
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
    return <Navigate to={backshopInhaltFallbackPath(prefix)} replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="backshop-inhalt-hub-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h2>
          <p className="text-muted-foreground mt-1">
            Wähle Werbung (KW-Übersicht) oder die kompakte Backshop-Liste mit Kacheln und PDF-Export.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="Werbung"
            description="Kalenderwoche wählen: zentrale Werbung bestellen, Strichcodes, Mengen Mo–Sa"
            icon={Megaphone}
            onClick={() => navigate(`${prefix}/backshop-werbung`)}
            variant="backshop"
            dataTour="backshop-hub-werbung-card"
          />
          <BereichsauswahlCard
            title="Backshop-Liste"
            description="Kacheln nach Warengruppe ohne Werbungs-Artikel, PDF mit Stand – gleiche Sortierung wie die PLU-Tabelle"
            icon={LayoutTemplate}
            onClick={() => navigate(`${prefix}/backshop-kacheln`)}
            variant="backshop"
            dataTour="backshop-hub-kachel-link"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
