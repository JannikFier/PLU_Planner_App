import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { LayoutGrid, BookText, GripVertical } from 'lucide-react'

/**
 * Super-Admin: Konfiguration Obst/Gemüse für den aktuellen Markt (Hub wie Admin, mit backTo-Kette per Query).
 */
export function SuperAdminMarktObstKonfigurationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentStoreId } = useCurrentStore()
  const { obstGemuese: obstVisible, isLoading } = useEffectiveListVisibility()

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

  if (!obstVisible) {
    return <Navigate to="/super-admin" replace />
  }

  const hubReturnUrl = `${location.pathname}${location.search}`

  const go = (path: string) => {
    navigate(`${path}?backTo=${encodeURIComponent(hubReturnUrl)}`)
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="super-admin-obst-konfig-hub-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-emerald-800">Konfiguration Obst/Gemüse</h2>
          <p className="text-muted-foreground">
            Layout, Bezeichnungsregeln und Warengruppen – nur bei Bedarf ändern.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Layout Obst/Gemüse"
            description="Sortierung, Schrift und Darstellung für diesen Markt"
            icon={LayoutGrid}
            onClick={() => go('/super-admin/layout')}
            color="text-violet-700"
            bg="bg-violet-50"
            dataTour="super-admin-obst-konfig-hub-layout-card"
          />
          <DashboardCard
            title="Bezeichnungsregeln (Obst)"
            description="Keyword-Regeln für Namen in diesem Markt"
            icon={BookText}
            onClick={() => go('/super-admin/rules')}
            color="text-violet-700"
            bg="bg-violet-50"
            dataTour="super-admin-obst-konfig-hub-rules-card"
          />
          <DashboardCard
            title="Warengruppen (Obst & Gemüse)"
            description="Reihenfolge am Markt, Zuordnung und Status – wie beim Backshop"
            icon={GripVertical}
            onClick={() => go('/super-admin/obst-warengruppen')}
            color="text-violet-700"
            bg="bg-violet-50"
            dataTour="super-admin-obst-konfig-hub-warengruppen-card"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
