import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { Apple, Croissant, Users } from 'lucide-react'

/**
 * Admin-Dashboard – drei Einstiege wie Super-Admin Markt-Übersicht: Obst, Backshop, Benutzer.
 * Detailnavigation unter /admin/obst und /admin/backshop.
 */
export function AdminDashboard() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { isUserPreviewActive, preview } = useUserPreview()
  const { currentStoreId } = useCurrentStore()
  usePrefetchForNavigation()

  const { obstGemuese: obstVisible, backshop: backshopVisible, isLoading: visibilityLoading } =
    useEffectiveListVisibility()

  if (isSuperAdmin && !(isUserPreviewActive && preview?.simulatedRole === 'admin')) {
    return <Navigate to="/super-admin" replace />
  }

  if (!currentStoreId) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Kein Markt zugewiesen. Bitte wende dich an deinen Administrator.</p>
        </div>
      </DashboardLayout>
    )
  }

  if (visibilityLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse bg-muted h-32 rounded-lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administration</h2>
          <p className="text-muted-foreground">
            Wähle einen Bereich – Listen und Konfiguration findest du unter Obst/Gemüse und Backshop.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {obstVisible && (
            <BereichsauswahlCard
              title="Obst und Gemüse"
              description="PLU-Liste und Konfiguration für diesen Markt"
              icon={Apple}
              onClick={() => navigate('/admin/obst')}
              variant="obst"
            />
          )}
          {backshopVisible && (
            <BereichsauswahlCard
              title="Backshop"
              description="Backshop-Liste und Konfiguration für diesen Markt"
              icon={Croissant}
              onClick={() => navigate('/admin/backshop')}
              variant="backshop"
            />
          )}
          <BereichsauswahlCard
            title="Benutzer"
            description="Personal anlegen und Passwörter zurücksetzen"
            icon={Users}
            onClick={() => navigate('/admin/users')}
            variant="benutzer"
          />
        </div>

        {!obstVisible && !backshopVisible && (
          <p className="text-sm text-muted-foreground text-center">
            Keine Listen freigeschaltet. Bitte den Super-Admin unter Einstellungen prüfen.
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}
