import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Users } from 'lucide-react'

/**
 * Admin Dashboard – Startseite für Admins (z.B. Abteilungsleiter).
 * PLU-Liste, Benutzerverwaltung. Benachrichtigungen über die Glocke oben rechts.
 * Eigene/Ausgeblendete Produkte über die Masterliste erreichbar.
 */
export function AdminDashboard() {
  const navigate = useNavigate()

  const cards = [
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
  ]

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
            <Card
              key={card.title}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`rounded-lg p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
