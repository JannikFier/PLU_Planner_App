import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useEffectiveListVisibility } from '@/hooks/useStoreListVisibility'
import { ClipboardList } from 'lucide-react'

/**
 * Viewer Dashboard – Startseite für Viewer.
 * Zeigt nur die Bereiche, die für den Viewer freigeschaltet sind.
 */
export function ViewerDashboard() {
  const navigate = useNavigate()
  const { currentStoreId } = useCurrentStore()
  usePrefetchForNavigation()

  const { obstGemuese: obstVisible, backshop: backshopVisible, isLoading: visibilityLoading } =
    useEffectiveListVisibility()

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
        description: 'PLU-Liste ansehen und als PDF herunterladen oder drucken',
        icon: ClipboardList,
        onClick: () => navigate('/viewer/masterlist'),
        color: 'text-primary',
        bg: 'bg-primary/10',
      })
    }

    if (backshopVisible) {
      result.push({
        title: 'PLU-Liste Backshop',
        description: 'Backshop-Liste mit Bild, PLU und Name ansehen',
        icon: ClipboardList,
        onClick: () => navigate('/viewer/backshop-list'),
        color: 'text-slate-600',
        bg: 'bg-slate-100',
      })
    }

    return result
  }, [navigate, obstVisible, backshopVisible])

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
          <h2 className="text-2xl font-bold tracking-tight">PLU-Liste</h2>
          <p className="text-muted-foreground">
            {cards.length === 0
              ? 'Keine Bereiche freigeschaltet.'
              : 'Hier kannst du die PLU-Liste ansehen sowie als PDF herunterladen oder drucken.'}
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="p-6 text-center rounded-lg border bg-muted/30">
            <p className="text-muted-foreground">Keine Bereiche freigeschaltet. Bitte wende dich an deinen Administrator.</p>
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
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
        )}
      </div>
    </DashboardLayout>
  )
}
