import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardCard, DashboardGroupCard } from '@/components/layout/DashboardCard'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePrefetchForNavigation } from '@/hooks/usePrefetchForNavigation'
import { NotificationDialog } from '@/components/plu/NotificationDialog'
import { Upload, Palette, FileText, Package, Users, ClipboardList, Plus, EyeOff, Bell } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Super-Admin Dashboard – Startseite für den Inhaber.
 * Strukturiert: PLU Upload, Benachrichtigungen, Layout oben; dann Gruppen-Kacheln.
 */
const PLU_ITEMS = [
  { title: 'Masterliste', description: 'PLU-Liste anzeigen und bearbeiten', icon: ClipboardList, to: '/super-admin/masterlist', color: 'text-slate-600', bg: 'bg-slate-100' },
  { title: 'Eigene Produkte', description: 'Hinzufügen, bearbeiten, ausblenden', icon: Plus, to: '/super-admin/custom-products', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Ausgeblendete', description: 'Einsehen und wieder einblenden', icon: EyeOff, to: '/super-admin/hidden-products', color: 'text-gray-600', bg: 'bg-gray-100' },
]
const CONFIG_ITEMS = [
  { title: 'Layout', description: 'Sortierung, Anzeige, Schriftgrößen', icon: Palette, to: '/super-admin/layout', color: 'text-violet-600', bg: 'bg-violet-50' },
  { title: 'Inhalt & Regeln', description: 'Bezeichnungsregeln und Warengruppen', icon: FileText, to: '/super-admin/rules', color: 'text-emerald-600', bg: 'bg-emerald-50' },
]
const ADMIN_ITEMS = [
  { title: 'Versionen', description: 'KW-Versionen verwalten', icon: Package, to: '/super-admin/versions', color: 'text-orange-600', bg: 'bg-orange-50' },
  { title: 'Benutzer', description: 'Admins und Personal verwalten', icon: Users, to: '/super-admin/users', color: 'text-sky-600', bg: 'bg-sky-50' },
]

export function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { data: activeVersion } = useActiveVersion()
  usePrefetchForNavigation()
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Super-Administration</h2>
          <p className="text-muted-foreground">
            Vollzugriff: PLU-Listen, Benutzer, Layout und alle Einstellungen.
          </p>
        </div>

        {/* Obere Reihe: Hauptaktionen (PLU Upload, Benachrichtigungen) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <DashboardCard
            title="PLU Upload"
            description="Neue Excel-Dateien hochladen und KW-Vergleich starten"
            icon={Upload}
            onClick={() => navigate('/super-admin/plu-upload')}
            color="text-primary"
            bg="bg-primary/10"
          />
          <DashboardCard
            title="Benachrichtigungen"
            description="Neue Produkte, PLU-Änderungen und Entfernte der aktiven KW"
            icon={Bell}
            onClick={() => {
              if (activeVersion) setShowNotificationsDialog(true)
              else toast.info('Keine aktive Kalenderwoche')
            }}
            color="text-amber-600"
            bg="bg-amber-50"
          />
        </div>

        {/* Gruppen-Kacheln */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardGroupCard
            title="PLU-Listen"
            description="Masterliste, eigene und ausgeblendete Produkte"
            items={PLU_ITEMS}
          />
          <DashboardGroupCard
            title="Konfiguration"
            description="Layout und Inhaltsregeln"
            items={CONFIG_ITEMS}
          />
          <DashboardGroupCard
            title="Verwaltung"
            description="Versionen und Benutzer"
            items={ADMIN_ITEMS}
          />
        </div>
      </div>

      {/* Benachrichtigungen-Dialog (aktive KW) für Super-Admin */}
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
