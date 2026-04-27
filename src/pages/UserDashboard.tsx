import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreview } from '@/contexts/UserPreviewContext'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { Apple, Croissant } from 'lucide-react'

/**
 * User Dashboard – Startseite für normale User.
 * Zeigt nur die Bereiche, die für den User freigeschaltet sind.
 */
export function UserDashboard() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { isUserPreviewActive } = useUserPreview()
  const { currentStoreId } = useCurrentStore()
  usePrefetchForNavigation()

  const { obstGemuese: obstVisible, backshop: backshopVisible, isLoading: visibilityLoading } =
    useEffectiveListVisibility()

  // Super-Admin gehoert auf /super-admin – ausser bei aktiver User-Vorschau (simulierte Rolle)
  if (isSuperAdmin && !isUserPreviewActive) {
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
        <div className="space-y-8">
          <div className="animate-pulse bg-muted h-32 rounded-lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div data-tour="dashboard-welcome">
          <h2 className="text-2xl font-bold tracking-tight">Willkommen</h2>
          <p className="text-muted-foreground">
            {obstVisible && backshopVisible
              ? 'Wähle die Liste: Obst und Gemüse oder Backshop.'
              : obstVisible || backshopVisible
                ? 'Wähle die Liste.'
                : 'Keine Bereiche freigeschaltet.'}
          </p>
        </div>

        {!obstVisible && !backshopVisible ? (
          <div className="p-6 text-center rounded-lg border bg-muted/30">
            <p className="text-muted-foreground">Keine Bereiche freigeschaltet. Bitte wende dich an deinen Administrator.</p>
          </div>
        ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {obstVisible && (
            <BereichsauswahlCard
              title="Obst und Gemüse"
              description="PLU-Liste anzeigen und exportieren"
              icon={Apple}
              onClick={() => navigate('/user/masterlist')}
              variant="obst"
              dataTour="dashboard-card-obst"
            />
          )}
          {backshopVisible && (
            <BereichsauswahlCard
              title="Backshop"
              description="Backshop-Liste mit Bild, PLU und Name"
              icon={Croissant}
              onClick={() => navigate('/user/backshop-list')}
              variant="backshop"
              dataTour="dashboard-card-backshop"
            />
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  )
}
