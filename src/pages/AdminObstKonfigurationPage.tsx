import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { LayoutGrid, BookText, GripVertical } from 'lucide-react'

/**
 * Admin: Konfiguration Obst/Gemüse – Layout, Regeln, Block-Sortierung (ein Screen wie Super-Admin „Konfiguration“).
 */
export function AdminObstKonfigurationPage() {
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
      <div className="space-y-8">
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
            onClick={() => navigate('/admin/layout')}
            color="text-violet-700"
            bg="bg-violet-50"
          />
          <DashboardCard
            title="Bezeichnungsregeln (Obst)"
            description="Keyword-Regeln für Namen in diesem Markt"
            icon={BookText}
            onClick={() => navigate('/admin/rules')}
            color="text-violet-700"
            bg="bg-violet-50"
          />
          <DashboardCard
            title="Warengruppen sortieren (Obst)"
            description="Drag & Drop: Reihenfolge und Zuordnung für diesen Markt"
            icon={GripVertical}
            onClick={() => navigate('/admin/block-sort')}
            color="text-violet-700"
            bg="bg-violet-50"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
