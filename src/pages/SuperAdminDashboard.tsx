import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Palette, FileText, Package, Users, ClipboardList, Plus, EyeOff, Bell } from 'lucide-react'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { NotificationDialog } from '@/components/plu/NotificationDialog'
import { toast } from 'sonner'

/** Einzelne Kachel (Hauptaktionen oben) */
function SingleCard({
  title,
  description,
  icon: Icon,
  onClick,
  color,
  bg,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  color: string
  bg: string
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <div className={`rounded-lg p-3 ${bg}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent />
    </Card>
  )
}

/** Überkachel mit mehreren Einträgen */
function GroupCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: Array<{
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    to: string
    color: string
    bg: string
  }>
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <div className={`rounded-md p-2 ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Super-Admin Dashboard – Startseite für den Inhaber.
 * Strukturiert: PLU Upload, Benachrichtigungen, Layout oben; dann Gruppen-Kacheln.
 */
export function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { data: activeVersion } = useActiveVersion()
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
          <SingleCard
            title="PLU Upload"
            description="Neue Excel-Dateien hochladen und KW-Vergleich starten"
            icon={Upload}
            onClick={() => navigate('/super-admin/plu-upload')}
            color="text-primary"
            bg="bg-primary/10"
          />
          <SingleCard
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
          <GroupCard
            title="PLU-Listen"
            description="Masterliste, eigene und ausgeblendete Produkte"
            items={[
              {
                title: 'Masterliste',
                description: 'PLU-Liste anzeigen und bearbeiten',
                icon: ClipboardList,
                to: '/super-admin/masterlist',
                color: 'text-slate-600',
                bg: 'bg-slate-100',
              },
              {
                title: 'Eigene Produkte',
                description: 'Hinzufügen, bearbeiten, ausblenden',
                icon: Plus,
                to: '/super-admin/custom-products',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                title: 'Ausgeblendete',
                description: 'Einsehen und wieder einblenden',
                icon: EyeOff,
                to: '/super-admin/hidden-products',
                color: 'text-gray-600',
                bg: 'bg-gray-100',
              },
            ]}
          />
          <GroupCard
            title="Konfiguration"
            description="Layout und Inhaltsregeln"
            items={[
              {
                title: 'Layout',
                description: 'Sortierung, Anzeige, Schriftgrößen',
                icon: Palette,
                to: '/super-admin/layout',
                color: 'text-violet-600',
                bg: 'bg-violet-50',
              },
              {
                title: 'Inhalt & Regeln',
                description: 'Bezeichnungsregeln und Warengruppen',
                icon: FileText,
                to: '/super-admin/rules',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
            ]}
          />
          <GroupCard
            title="Verwaltung"
            description="Versionen und Benutzer"
            items={[
              {
                title: 'Versionen',
                description: 'KW-Versionen verwalten',
                icon: Package,
                to: '/super-admin/versions',
                color: 'text-orange-600',
                bg: 'bg-orange-50',
              },
              {
                title: 'Benutzer',
                description: 'Admins und Personal verwalten',
                icon: Users,
                to: '/super-admin/users',
                color: 'text-sky-600',
                bg: 'bg-sky-50',
              },
            ]}
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
