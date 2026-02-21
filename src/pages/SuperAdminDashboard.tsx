import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { Apple, Croissant, Users } from 'lucide-react'

/**
 * Super-Admin Dashboard – Startseite für den Inhaber.
 * Drei Karten: Obst und Gemüse | Backshop | Benutzer.
 * Details und Benachrichtigungen auf den Bereichsseiten /super-admin/obst und /super-admin/backshop.
 */
export function SuperAdminDashboard() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Super-Administration</h2>
          <p className="text-muted-foreground">
            Bereich wählen: Obst und Gemüse, Backshop oder Benutzerverwaltung.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <BereichsauswahlCard
            title="Obst und Gemüse"
            description="PLU-Listen, Upload, Konfiguration und Versionen"
            icon={Apple}
            onClick={() => navigate('/super-admin/obst')}
            variant="obst"
          />
          <BereichsauswahlCard
            title="Backshop"
            description="Backshop-Listen, Upload, Konfiguration und Versionen"
            icon={Croissant}
            onClick={() => navigate('/super-admin/backshop')}
            variant="backshop"
          />
          <BereichsauswahlCard
            title="Benutzer"
            description="Admins und Personal verwalten"
            icon={Users}
            onClick={() => navigate('/super-admin/users')}
            variant="benutzer"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
