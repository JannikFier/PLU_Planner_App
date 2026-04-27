// ObstWarengruppenPage: Warengruppen-Workbench (Obst/Gemüse), Einstieg von Masterliste oder Konfiguration

import { Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, Settings } from 'lucide-react'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { ObstWarengruppenPanel } from '@/components/plu/ObstWarengruppenPanel'

export function ObstWarengruppenPage() {
  const { data: layoutSettings } = useLayoutSettings()
  const isByBlock = layoutSettings?.sort_mode === 'BY_BLOCK'
  const location = useLocation()
  const rolePrefix = location.pathname.startsWith('/super-admin')
    ? '/super-admin'
    : location.pathname.startsWith('/admin')
      ? '/admin'
      : '/user'

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="obst-konfig-warengruppen-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warengruppen (Obst & Gemüse)</h2>
          <p className="text-sm text-muted-foreground">
            Warengruppen links, Artikel in der Mitte, Status rechts: Suche, Drag-and-Drop oder Mehrfachauswahl zur
            Zuordnung (Markt-Overrides für den aktuellen Markt). Die Reihenfolge der Warengruppen am Markt kannst du als
            Admin am waagerechten Griff links ändern.
          </p>
        </div>

        {!isByBlock && (
          <Alert data-tour="obst-konfig-warengruppen-layout-hint">
            <Info className="h-4 w-4" />
            <AlertTitle>Sortierung „Nach Warengruppen“</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Die Warengruppen-Workbench nutzt effektive Gruppen am besten, wenn die Darstellung auf{' '}
                <strong>Nach Warengruppen</strong> eingestellt ist.
              </span>
              {rolePrefix === '/user' ? (
                <span className="text-sm text-muted-foreground">
                  Die Layout-Sortierung kann nur ein <strong>Marktleiter (Admin)</strong> in den Layout-Einstellungen
                  des Marktes ändern.
                </span>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`${rolePrefix}/layout`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Layout-Einstellungen
                  </Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isByBlock ? (
          <div data-tour="obst-konfig-warengruppen-panel-section">
            <ObstWarengruppenPanel />
          </div>
        ) : (
          <Card data-tour="obst-konfig-warengruppen-info-card">
            <CardHeader>
              <CardTitle>Warengruppen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Sobald die Sortierung auf <strong>Nach Warengruppen</strong> steht, erscheint hier die
                    Warengruppen-Workbench.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
