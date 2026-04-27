import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard } from '@/components/layout/DashboardCard'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { BackshopNotificationDialog } from '@/components/plu/BackshopNotificationDialog'
import { Upload, Package, Bell, ListTree, Megaphone, Link2 } from 'lucide-react'
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
            description="Edeka-, Harry- und Aryzta-Upload auf einer Seite untereinander"
            icon={Upload}
            onClick={() => navigate('/super-admin/backshop-upload')}
            color="text-blue-700"
            bg="bg-blue-50"
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
            title="Produktgruppen (Marken)"
            description="Gleiche Artikel aus Edeka/Harry/Aryzta verbinden oder trennen"
            icon={Link2}
            onClick={() => navigate('/super-admin/backshop-product-groups')}
            color="text-emerald-700"
            bg="bg-emerald-50"
          />
          <DashboardCard
            title="Warengruppen (global)"
            description="Globale Warengruppen-Konfiguration für alle Märkte"
            icon={ListTree}
            onClick={() => navigate('/super-admin/backshop-warengruppen')}
            color="text-violet-600"
            bg="bg-violet-50"
          />
          <DashboardCard
            title="Zentrale Werbung (Exit)"
            description="Wochenwerbung-Excel für alle Märkte, aktuelle KW"
            icon={Megaphone}
            onClick={() => navigate('/super-admin/central-werbung/backshop')}
            color="text-slate-700"
            bg="bg-slate-100"
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
