import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { LayoutGrid, BookText, GripVertical, ListFilter } from 'lucide-react'

/**
 * Super-Admin: Konfiguration Backshop für den aktuellen Markt (Hub wie Admin, mit backTo-Kette per Query).
 */
export function SuperAdminMarktBackshopKonfigurationPage() {
  const navigate = useNavigate()
  const location = useLocation()
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
    return <Navigate to="/super-admin" replace />
  }

  const hubReturnUrl = `${location.pathname}${location.search}`

  const go = (path: string) => {
    navigate(`${path}?backTo=${encodeURIComponent(hubReturnUrl)}`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="super-admin-backshop-konfig-hub-page">
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
            onClick={() => go('/super-admin/backshop-layout')}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="super-admin-backshop-konfig-hub-layout-card"
          />
          <DashboardCard
            title="Bezeichnungsregeln (Backshop)"
            description="Keyword-Regeln für Namen in diesem Markt"
            icon={BookText}
            onClick={() => go('/super-admin/backshop-rules')}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="super-admin-backshop-konfig-hub-rules-card"
          />
          <DashboardCard
            title="Warengruppen sortieren (Backshop)"
            description="Drag & Drop für diesen Markt"
            icon={GripVertical}
            onClick={() => go('/super-admin/backshop-block-sort')}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="super-admin-backshop-konfig-hub-block-sort-card"
          />
          <DashboardCard
            title="Gruppenregeln (Backshop)"
            description="Bevorzugte Marke pro Warengruppe, Basis für die Listenansicht"
            icon={ListFilter}
            onClick={() => go('/super-admin/backshop-gruppenregeln')}
            color="text-amber-800"
            bg="bg-amber-50"
            dataTour="super-admin-backshop-konfig-hub-gruppenregeln-card"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
