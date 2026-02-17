import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { ClipboardList } from 'lucide-react'

/**
 * User Dashboard – Startseite für normale User.
 * Zeigt Schnellzugriff auf PLU-Liste. Benachrichtigungen über die Glocke oben rechts.
 * Eigene/Ausgeblendete Produkte über die Masterliste erreichbar.
 */
export function UserDashboard() {
  const navigate = useNavigate()
  usePrefetchForNavigation()

  const cards = useMemo(() => [
    {
      title: 'PLU-Liste',
      description: 'Aktuelle PLU-Liste anzeigen und exportieren',
      icon: ClipboardList,
      onClick: () => navigate('/user/masterlist'),
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ], [navigate])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Willkommen</h2>
          <p className="text-muted-foreground">
            Hier findest du deine personalisierte PLU-Liste.
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
