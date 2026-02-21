import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard, DashboardGroupCard } from '@/components/layout/DashboardCard'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { BackshopNotificationDialog } from '@/components/plu/BackshopNotificationDialog'
import { Upload, Palette, FileText, Package, ClipboardList, Plus, EyeOff, Bell, Pencil, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

const BACKSHOP_ITEMS = [
  { title: 'Backshop-Liste', description: 'Backshop-Liste mit Bild, PLU und Name', icon: ClipboardList, to: '/super-admin/backshop-list', color: 'text-slate-600', bg: 'bg-slate-100' },
  { title: 'Eigene Produkte (Backshop)', description: 'Eigene Backshop-Produkte mit Bild anlegen', icon: Plus, to: '/super-admin/backshop-custom-products', color: 'text-slate-600', bg: 'bg-slate-100' },
  { title: 'Ausgeblendete (Backshop)', description: 'Ausgeblendete Backshop-Produkte einblenden', icon: EyeOff, to: '/super-admin/backshop-hidden-products', color: 'text-slate-600', bg: 'bg-slate-100' },
  { title: 'Werbung (Backshop)', description: 'Angebote verwalten (Backshop)', icon: Megaphone, to: '/super-admin/backshop-offer-products', color: 'text-slate-600', bg: 'bg-slate-100' },
  { title: 'Umbenannte (Backshop)', description: 'Anzeigenamen und Bilder anpassen', icon: Pencil, to: '/super-admin/backshop-renamed-products', color: 'text-slate-600', bg: 'bg-slate-100' },
]
const BACKSHOP_CONFIG_ITEMS = [
  { title: 'Layout (Backshop)', description: 'Sortierung und Schriftgrößen für Backshop', icon: Palette, to: '/super-admin/backshop-layout', color: 'text-violet-600', bg: 'bg-violet-50' },
  { title: 'Inhalt & Regeln (Backshop)', description: 'Bezeichnungsregeln und Warengruppen Backshop', icon: FileText, to: '/super-admin/backshop-rules', color: 'text-emerald-600', bg: 'bg-emerald-50' },
]
const BACKSHOP_ADMIN_ITEMS = [
  { title: 'Backshop-Versionen', description: 'KW-Versionen der Backshop-Liste verwalten', icon: Package, to: '/super-admin/backshop-versions', color: 'text-orange-600', bg: 'bg-orange-50' },
]

/**
 * Super-Admin: Bereich Backshop – alle Optionen (Upload, Benachrichtigungen, Listen, Konfiguration, Versionen).
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
            Backshop-Listen, Konfiguration und Versionen.
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardGroupCard
            title="Backshop-Listen"
            description="Liste, eigene und ausgeblendete Produkte"
            items={BACKSHOP_ITEMS}
          />
          <DashboardGroupCard
            title="Konfiguration (Backshop)"
            description="Layout und Inhaltsregeln"
            items={BACKSHOP_CONFIG_ITEMS}
          />
          <DashboardGroupCard
            title="Verwaltung (Backshop)"
            description="Backshop-Versionen"
            items={BACKSHOP_ADMIN_ITEMS}
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
