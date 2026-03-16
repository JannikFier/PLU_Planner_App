import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { BackshopNotificationDialog } from '@/components/plu/BackshopNotificationDialog'
import { Upload, Package, Bell, ListTree } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Super-Admin: Bereich Backshop – NUR globale Aktionen
 * (Upload, Benachrichtigungen, Versionen, Warengruppen).
 * Marktspezifische Listen/Konfiguration werden auf der Markt-Detailseite verwaltet.
 */
export function SuperAdminBackshopBereichPage() {
  const navigate = useNavigate()
  const { data: activeBackshopVersion } = useActiveBackshopVersion()
  usePrefetchForNavigation()
  const [showBackshopNotificationsDialog, setShowBackshopNotificationsDialog] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Backshop</h2>
          <p className="text-muted-foreground">
            Backshop-Listen hochladen, Versionen und Benachrichtigungen verwalten.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardCard
            title="Backshop Upload"
            description="Backshop-Excel-Dateien hochladen und einspielen"
            icon={Upload}
            onClick={() => navigate('/super-admin/backshop-upload')}
            color="text-slate-600"
            bg="bg-slate-100"
          />
          <DashboardCard
            title="Benachrichtigungen Backshop"
            description="Neue und geänderte Backshop-Produkte der aktiven KW"
            icon={Bell}
            onClick={() => {
              if (activeBackshopVersion) setShowBackshopNotificationsDialog(true)
              else toast.info('Keine aktive Backshop-Kalenderwoche')
            }}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <DashboardCard
            title="Backshop-Versionen"
            description="KW-Versionen der Backshop-Liste verwalten"
            icon={Package}
            onClick={() => navigate('/super-admin/backshop-versions')}
            color="text-orange-600"
            bg="bg-orange-50"
          />
          <DashboardCard
            title="Warengruppen (global)"
            description="Globale Warengruppen-Konfiguration für alle Märkte"
            icon={ListTree}
            onClick={() => navigate('/super-admin/backshop-warengruppen')}
            color="text-violet-600"
            bg="bg-violet-50"
          />
        </div>
      </div>

      {activeBackshopVersion && (
        <BackshopNotificationDialog
          open={showBackshopNotificationsDialog}
          onOpenChange={setShowBackshopNotificationsDialog}
          notification={{
            id: '',
            version_id: activeBackshopVersion.id,
            versions: {
              id: activeBackshopVersion.id,
              kw_nummer: activeBackshopVersion.kw_nummer,
              jahr: activeBackshopVersion.jahr,
              kw_label: activeBackshopVersion.kw_label,
            },
          }}
        />
      )}
    </DashboardLayout>
  )
}
