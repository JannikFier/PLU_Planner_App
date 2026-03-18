import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { useUserListVisibility } from '@/hooks/useStoreListVisibility'
import { ClipboardList, Users } from 'lucide-react'

/**
 * Admin Dashboard – Startseite für Admins (z.B. Abteilungsleiter).
 * Zeigt nur die Bereiche, die für den Admin freigeschaltet sind.
 */
export function AdminDashboard() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const { currentStoreId } = useCurrentStore()
  usePrefetchForNavigation()

  const { data: visibility, isLoading: visibilityLoading } = useUserListVisibility()
  const obstVisible = visibility?.find(v => v.list_type === 'obst_gemuese')?.is_visible ?? true
  const backshopVisible = visibility?.find(v => v.list_type === 'backshop')?.is_visible ?? true

  const cards = useMemo(() => {
    const result: {
      title: string
      description: string
      icon: typeof ClipboardList
      onClick: () => void
      color: string
      bg: string
    }[] = []

    if (obstVisible) {
      result.push({
        title: 'PLU-Liste Obst/Gemüse',
        description: 'Aktuelle PLU-Liste anzeigen und exportieren',
        icon: ClipboardList,
        onClick: () => navigate('/admin/masterlist'),
        color: 'text-primary',
        bg: 'bg-primary/10',
      })
    }

    if (backshopVisible) {
      result.push({
        title: 'PLU-Liste Backshop',
        description: 'Backshop-Liste mit Bild, PLU und Name',
        icon: ClipboardList,
        onClick: () => navigate('/admin/backshop-list'),
        color: 'text-slate-600',
        bg: 'bg-slate-100',
      })
    }

    result.push({
      title: 'Benutzerverwaltung',
      description: 'Personal anlegen und Passwörter zurücksetzen',
      icon: Users,
      onClick: () => navigate('/admin/users'),
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    })

    return result
  }, [navigate, obstVisible, backshopVisible])

  // Super-Admin gehoert auf /super-admin (Schutz-Redirect bei falschem Routing)
  if (isSuperAdmin) {
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administration</h2>
          <p className="text-muted-foreground">
            PLU-Liste ansehen, Personal verwalten und Passwörter zurücksetzen.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <DashboardCard
              key={card.title}
              title={card.title}
              description={card.description}
              icon={card.icon}
              onClick={card.onClick}
              color={card.color}
              bg={card.bg}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
