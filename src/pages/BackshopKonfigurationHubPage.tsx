import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'
import { LayoutGrid, BookText, GripVertical, ListFilter } from 'lucide-react'

function konfigHubFallbackPath(prefix: string): string {
  if (prefix === '/admin') return '/admin'
  if (prefix === '/viewer') return '/viewer'
  if (prefix === '/super-admin') return '/super-admin'
  return '/user'
}

/**
 * Backshop-Konfigurations-Hub (User, Admin, Viewer): Layout, Regeln, Sortierung, Gruppenregeln.
 */
export function BackshopKonfigurationHubPage() {
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
    return <Navigate to={konfigHubFallbackPath(prefix)} replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="backshop-konfig-hub-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Konfiguration Backshop</h2>
          <p className="text-muted-foreground">
            Layout, Bezeichnungsregeln, bevorzugte Marken pro Warengruppe und Sortierung – nur bei Bedarf ändern.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Layout Backshop"
            description="Darstellung und Optionen für diesen Markt"
            icon={LayoutGrid}
            onClick={() => navigate(`${prefix}/backshop-layout`)}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="backshop-konfig-hub-layout-card"
          />
          <DashboardCard
            title="Bezeichnungsregeln (Backshop)"
            description="Keyword-Regeln für Namen in diesem Markt"
            icon={BookText}
            onClick={() => navigate(`${prefix}/backshop-rules`)}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="backshop-konfig-hub-rules-card"
          />
          <DashboardCard
            title="Warengruppen sortieren (Backshop)"
            description="Drag & Drop für diesen Markt"
            icon={GripVertical}
            onClick={() => navigate(`${prefix}/backshop-block-sort`)}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="backshop-konfig-hub-block-sort-card"
          />
          <DashboardCard
            title="Gruppenregeln (Backshop)"
            description="Bevorzugte Marke pro Warengruppe, Basis für die Listenansicht"
            icon={ListFilter}
            onClick={() => navigate(`${prefix}/backshop-gruppenregeln`)}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="backshop-konfig-hub-gruppenregeln-card"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
