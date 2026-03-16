import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BereichsauswahlCard } from '@/components/layout/BereichsauswahlCard'
import { Apple, Croissant } from 'lucide-react'

/**
 * Upload-Auswahl – Obst/Gemuese oder Backshop.
 * Alles in diesem Bereich ist GLOBAL (gilt fuer alle Maerkte).
 */
export function SuperAdminUploadPage() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Upload & Verwaltung</h2>
          <p className="text-muted-foreground">
            PLU-Listen hochladen, Versionen und Benachrichtigungen verwalten.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <BereichsauswahlCard
            title="Obst & Gemüse"
            description="PLU-Upload, Benachrichtigungen, Versionen"
            icon={Apple}
            onClick={() => navigate('/super-admin/obst')}
            variant="obst"
          />
          <BereichsauswahlCard
            title="Backshop"
            description="Backshop-Upload, Benachrichtigungen, Versionen, Warengruppen"
            icon={Croissant}
            onClick={() => navigate('/super-admin/backshop')}
            variant="backshop"
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
