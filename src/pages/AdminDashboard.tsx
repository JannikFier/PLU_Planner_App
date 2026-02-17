import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { ClipboardList, Users } from 'lucide-react'

/**
 * Admin Dashboard – Startseite für Admins (z.B. Abteilungsleiter).
 * PLU-Liste, Benutzerverwaltung. Benachrichtigungen über die Glocke oben rechts.
 * Eigene/Ausgeblendete Produkte über die Masterliste erreichbar.
 */
export function AdminDashboard() {
  const navigate = useNavigate()
  usePrefetchForNavigation()

  const cards = useMemo(() => [
    {
      title: 'PLU-Liste',
      description: 'Aktuelle PLU-Liste anzeigen und exportieren',
      icon: ClipboardList,
      onClick: () => navigate('/admin/masterlist'),
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Benutzerverwaltung',
      description: 'Personal anlegen und Passwörter zurücksetzen',
      icon: Users,
      onClick: () => navigate('/admin/users'),
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
  ], [navigate])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administration</h2>
          <p className="text-muted-foreground">
            PLU-Liste ansehen, Personal verwalten und Passwörter zurücksetzen.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
