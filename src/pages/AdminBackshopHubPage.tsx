import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { ClipboardList, LayoutGrid } from 'lucide-react'

/**
 * Admin: Unterbereich Backshop – PLU-Liste oder Konfiguration.
 */
export function AdminBackshopHubPage() {
  const navigate = useNavigate()
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
    return <Navigate to="/admin" replace />
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h2>
          <p className="text-muted-foreground">
            Backshop-Liste öffnen oder Darstellung und Regeln für diesen Markt anpassen.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="PLU-Liste"
            description="Backshop-Liste, eigene Produkte, Ausgeblendete, Werbung, Umbenennungen"
            icon={ClipboardList}
            onClick={() => navigate('/admin/backshop-list')}
            variant="backshop"
          />
          <BereichsauswahlCard
            title="Konfiguration der Liste"
            description="Layout, Bezeichnungsregeln und Warengruppen-Sortierung"
            icon={LayoutGrid}
            onClick={() => navigate('/admin/backshop/konfiguration')}
            variant="backshop"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
