import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { ClipboardList, LayoutGrid } from 'lucide-react'

/**
 * Admin: Unterbereich Obst/Gemüse – PLU-Liste oder Konfiguration (wie Super-Admin Markt → Listen → Obst).
 */
export function AdminObstHubPage() {
  const navigate = useNavigate()
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
    return <Navigate to="/admin" replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-tour="admin-obst-hub-page">
        <div data-tour="admin-obst-hub-heading">
          <h2 className="text-2xl font-bold tracking-tight text-emerald-800">Obst und Gemüse</h2>
          <p className="text-muted-foreground">
            PLU-Liste öffnen oder Darstellung und Regeln für diesen Markt anpassen.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="PLU-Liste"
            description="Masterliste, eigene Produkte, Ausgeblendete, Werbung, Umbenennungen"
            icon={ClipboardList}
            onClick={() => navigate('/admin/masterlist')}
            variant="obst"
            dataTour="admin-obst-hub-liste"
          />
          <BereichsauswahlCard
            title="Konfiguration der Liste"
            description="Layout, Bezeichnungsregeln und Warengruppen (Workbench)"
            icon={LayoutGrid}
            onClick={() => navigate('/admin/obst/konfiguration')}
            variant="obst"
            dataTour="admin-obst-hub-konfig"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
