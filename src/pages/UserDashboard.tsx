import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { Apple, Croissant } from 'lucide-react'

/**
 * User Dashboard – Startseite für normale User.
 * Zwei Karten: Obst und Gemüse → PLU-Liste, Backshop → Backshop-Liste.
 * Eigene Produkte, Ausgeblendete und Umbenannte weiterhin über die Toolbar der Listen erreichbar.
 */
export function UserDashboard() {
  const navigate = useNavigate()
  usePrefetchForNavigation()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Willkommen</h2>
          <p className="text-muted-foreground">
            Wähle die Liste: Obst und Gemüse oder Backshop.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="Obst und Gemüse"
            description="PLU-Liste anzeigen und exportieren"
            icon={Apple}
            onClick={() => navigate('/user/masterlist')}
            variant="obst"
          />
          <BereichsauswahlCard
            title="Backshop"
            description="Backshop-Liste mit Bild, PLU und Name"
            icon={Croissant}
            onClick={() => navigate('/user/backshop-list')}
            variant="backshop"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
