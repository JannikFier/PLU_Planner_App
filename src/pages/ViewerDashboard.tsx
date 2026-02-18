import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { ClipboardList } from 'lucide-react'

/**
 * Viewer Dashboard – Startseite für Viewer.
 * Nur eine Karte: PLU-Liste (Ansehen + PDF). Keine weiteren Funktionen.
 */
export function ViewerDashboard() {
  const navigate = useNavigate()
  usePrefetchForNavigation()

  const cards = useMemo(() => [
    {
      title: 'PLU-Liste',
      description: 'PLU-Liste ansehen und als PDF herunterladen oder drucken',
      icon: ClipboardList,
      onClick: () => navigate('/viewer/masterlist'),
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ], [navigate])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">PLU-Liste</h2>
          <p className="text-muted-foreground">
            Hier kannst du die PLU-Liste ansehen sowie als PDF herunterladen oder drucken.
          </p>
        </div>

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
      </div>
    </DashboardLayout>
  )
}
