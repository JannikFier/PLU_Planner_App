import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { NotificationDialog } from '@/components/plu/NotificationDialog'
import { Upload, Package, Bell, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Super-Admin: Bereich Obst und Gemuese – NUR globale Aktionen
 * (Upload, Benachrichtigungen, Versionen).
 * Marktspezifische Listen/Konfiguration werden auf der Markt-Detailseite verwaltet.
 */
export function SuperAdminObstBereichPage() {
  const navigate = useNavigate()
  const { data: activeVersion } = useActiveVersion()
  usePrefetchForNavigation()
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-emerald-800">Obst und Gemüse</h2>
          <p className="text-muted-foreground">
            PLU-Listen hochladen, Versionen und Benachrichtigungen verwalten.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="PLU Upload Obst/Gemüse"
            description="Neue Excel-Dateien hochladen und KW-Vergleich starten"
            icon={Upload}
            onClick={() => navigate('/super-admin/plu-upload')}
            color="text-primary"
            bg="bg-primary/10"
          />
          <DashboardCard
            title="Benachrichtigungen Obst/Gemüse"
            description="Neue Produkte, PLU-Änderungen der aktiven KW"
            icon={Bell}
            onClick={() => {
              if (activeVersion) setShowNotificationsDialog(true)
              else toast.info('Keine aktive Kalenderwoche')
            }}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <DashboardCard
            title="Versionen"
            description="KW-Versionen verwalten (Obst/Gemüse)"
            icon={Package}
            onClick={() => navigate('/super-admin/versions')}
            color="text-orange-600"
            bg="bg-orange-50"
          />
          <DashboardCard
            title="Zentrale Werbung (Exit)"
            description="Wochenwerbung-Excel für alle Märkte, aktuelle KW"
            icon={Megaphone}
            onClick={() => navigate('/super-admin/central-werbung/obst')}
            color="text-emerald-700"
            bg="bg-emerald-50"
          />
        </div>
      </div>

      {activeVersion && (
        <NotificationDialog
          open={showNotificationsDialog}
          onOpenChange={setShowNotificationsDialog}
          notification={{
            id: '',
            version_id: activeVersion.id,
            versions: {
              id: activeVersion.id,
              kw_nummer: activeVersion.kw_nummer,
              jahr: activeVersion.jahr,
              kw_label: activeVersion.kw_label,
            },
          }}
        />
      )}
    </DashboardLayout>
  )
}
