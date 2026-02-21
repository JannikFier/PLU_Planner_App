import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard, DashboardGroupCard } from '@/components/layout/DashboardCard'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { NotificationDialog } from '@/components/plu/NotificationDialog'
import { Upload, Palette, FileText, Package, ClipboardList, Plus, EyeOff, Bell, Pencil, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

const OBST_ITEMS = [
  { title: 'Masterliste Obst/Gemüse', description: 'PLU-Liste anzeigen und bearbeiten', icon: ClipboardList, to: '/super-admin/masterlist', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Eigene Produkte', description: 'Hinzufügen, bearbeiten, ausblenden (Obst/Gemüse)', icon: Plus, to: '/super-admin/custom-products', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Ausgeblendete', description: 'Einsehen und wieder einblenden (Obst/Gemüse)', icon: EyeOff, to: '/super-admin/hidden-products', color: 'text-gray-600', bg: 'bg-gray-100' },
  { title: 'Werbung', description: 'Angebote verwalten (Obst/Gemüse)', icon: Megaphone, to: '/super-admin/offer-products', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Umbenannte', description: 'Anzeigenamen anpassen (Obst/Gemüse)', icon: Pencil, to: '/super-admin/renamed-products', color: 'text-emerald-600', bg: 'bg-emerald-50' },
]
const OBST_CONFIG_ITEMS = [
  { title: 'Layout (Obst/Gemüse)', description: 'Sortierung, Anzeige, Schriftgrößen', icon: Palette, to: '/super-admin/layout', color: 'text-violet-600', bg: 'bg-violet-50' },
  { title: 'Inhalt & Regeln (Obst/Gemüse)', description: 'Bezeichnungsregeln und Warengruppen', icon: FileText, to: '/super-admin/rules', color: 'text-emerald-600', bg: 'bg-emerald-50' },
]
const OBST_ADMIN_ITEMS = [
  { title: 'Versionen', description: 'KW-Versionen verwalten (Obst/Gemüse)', icon: Package, to: '/super-admin/versions', color: 'text-orange-600', bg: 'bg-orange-50' },
]

/**
 * Super-Admin: Bereich Obst und Gemüse – alle Optionen (Upload, Benachrichtigungen, Listen, Konfiguration, Versionen).
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
            PLU-Listen, Konfiguration und Versionen für Obst/Gemüse.
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardGroupCard
            title="PLU-Listen"
            description="Masterliste, eigene und ausgeblendete Produkte"
            items={OBST_ITEMS}
          />
          <DashboardGroupCard
            title="Konfiguration"
            description="Layout und Inhaltsregeln"
            items={OBST_CONFIG_ITEMS}
          />
          <DashboardGroupCard
            title="Verwaltung"
            description="KW-Versionen"
            items={OBST_ADMIN_ITEMS}
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
