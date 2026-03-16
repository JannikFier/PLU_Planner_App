import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { Building2, Upload } from 'lucide-react'

/**
 * Super-Admin Dashboard – Startseite fuer den Inhaber.
 * Zwei Karten: Firmen & Maerkte | Upload
 * (Obst/Gemuese und Backshop sind marktspezifisch und werden auf der Markt-Detailseite verwaltet)
 */
export function SuperAdminDashboard() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Super-Administration</h2>
          <p className="text-muted-foreground">
            Firmen und Märkte verwalten, PLU-Listen hochladen.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="Firmen & Märkte"
            description="Firmen, Märkte und Benutzer verwalten"
            icon={Building2}
            onClick={() => navigate('/super-admin/companies')}
            variant="benutzer"
          />
          <BereichsauswahlCard
            title="Upload"
            description="PLU-Listen hochladen (Obst/Gemüse + Backshop)"
            icon={Upload}
            onClick={() => navigate('/super-admin/upload')}
            variant="obst"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
