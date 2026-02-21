import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { ClipboardList, Users, Layers, EyeOff, Pencil } from 'lucide-react'

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
      title: 'PLU-Liste Obst/Gemüse',
      description: 'Aktuelle PLU-Liste anzeigen und exportieren',
      icon: ClipboardList,
      onClick: () => navigate('/admin/masterlist'),
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'PLU-Liste Backshop',
      description: 'Backshop-Liste mit Bild, PLU und Name',
      icon: ClipboardList,
      onClick: () => navigate('/admin/backshop-list'),
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'Eigene Produkte (Backshop)',
      description: 'Eigene Backshop-Produkte mit Bild anlegen und verwalten',
      icon: Layers,
      onClick: () => navigate('/admin/backshop-custom-products'),
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'Ausgeblendete Produkte (Backshop)',
      description: 'Ausgeblendete Backshop-Produkte einblenden',
      icon: EyeOff,
      onClick: () => navigate('/admin/backshop-hidden-products'),
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'Umbenannte Produkte (Backshop)',
      description: 'Anzeigenamen und Bilder in der Backshop-Liste anpassen',
      icon: Pencil,
      onClick: () => navigate('/admin/backshop-renamed-products'),
      color: 'text-slate-600',
      bg: 'bg-slate-100',
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
