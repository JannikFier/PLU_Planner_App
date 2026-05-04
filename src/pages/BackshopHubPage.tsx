import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Croissant, LayoutGrid } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'

/** Dashboard nach Rolle, wenn Backshop für den Markt ausgeblendet ist. */
function backshopHubFallbackPath(prefix: string): string {
  if (prefix === '/admin') return '/admin'
  if (prefix === '/viewer') return '/viewer'
  if (prefix === '/super-admin') return '/super-admin'
  return '/user'
}

/**
 * Backshop-Einstieg (User, Admin, Viewer): drei Karten wie Super-Admin Markt → Listen → Backshop;
 * Untermenü Werbung/Kachel-Liste über `/…/backshop/inhalt`.
 */
export function BackshopHubPage() {
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
    return <Navigate to={backshopHubFallbackPath(prefix)} replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="backshop-hub-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h2>
          <p className="text-muted-foreground mt-1">
            PLU-Tabelle und Konfiguration direkt; unter „Backshop“ zusätzlich Werbung nach Kalenderwoche oder
            Kachel-Übersicht mit PDF.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BereichsauswahlCard
            title="PLU-Liste"
            description="Backshop-Liste, eigene Produkte, Ausgeblendete, Werbung, Umbenennungen – Aktionen in der Toolbar"
            icon={ClipboardList}
            onClick={() => navigate(`${prefix}/backshop-list`)}
            variant="backshop"
            dataTour="backshop-root-plu-card"
          />
          <BereichsauswahlCard
            title="Konfiguration der Liste"
            description="Layout, Bezeichnungsregeln, Gruppenregeln und Warengruppen-Sortierung"
            icon={LayoutGrid}
            onClick={() => navigate(`${prefix}/backshop/konfiguration`)}
            variant="backshop"
            dataTour="backshop-root-konfig-card"
          />
          <BereichsauswahlCard
            title="Backshop"
            description="Werbung nach Kalenderwoche oder Kachel-Übersicht (Warengruppen, PDF) – gleiche Daten wie die PLU-Tabelle"
            icon={Croissant}
            onClick={() => navigate(`${prefix}/backshop/inhalt`)}
            variant="backshop"
            dataTour="backshop-root-inhalt-card"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
