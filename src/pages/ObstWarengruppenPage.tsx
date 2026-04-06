// ObstWarengruppenPage: Warengruppen zuordnen (Obst/Gemüse), Einstieg von der Masterliste oder Regeln

import { Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Info, Settings } from 'lucide-react'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { WarengruppenPanel } from '@/components/plu/WarengruppenPanel'

export function ObstWarengruppenPage() {
  const { data: layoutSettings } = useLayoutSettings()
  const isByBlock = layoutSettings?.sort_mode === 'BY_BLOCK'
  const location = useLocation()
  const rolePrefix = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin'

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warengruppen (Obst/Gemüse)</h2>
          <p className="text-sm text-muted-foreground">
            Gruppen anlegen, Produkte zuordnen und per Dialog hinzufügen. Die Reihenfolge auf der Liste passt du unter
            „PLU-Liste bearbeiten“ an.
          </p>
        </div>

        {isByBlock ? (
          <WarengruppenPanel />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Warengruppen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Warengruppen sind nur aktiv, wenn im Layout die Sortierung{' '}
                    <strong>Nach Warengruppen</strong> gewählt ist.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${rolePrefix}/layout`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Zu den Layout-Einstellungen
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
