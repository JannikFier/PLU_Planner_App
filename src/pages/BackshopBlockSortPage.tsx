// BackshopBlockSortPage: Warengruppen-Workbench (Zuordnung pro Markt)

import { Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BackshopWarengruppenPanel } from '@/components/plu/BackshopWarengruppenPanel'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Info, Settings } from 'lucide-react'

export function BackshopBlockSortPage() {
  const { data: layoutSettings } = useBackshopLayoutSettings()
  const location = useLocation()
  const isByBlock = layoutSettings?.sort_mode === 'BY_BLOCK'
  const layoutPrefix = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin'

  return (
    <DashboardLayout>
      <div className="space-y-6" data-tour="backshop-konfig-block-sort-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warengruppen (Backshop)</h2>
          <p className="text-sm text-muted-foreground">
            Warengruppen links, Artikel in der Mitte, Status rechts: Suche, Drag-and-Drop oder Mehrfachauswahl zur
            Zuordnung (Markt-Overrides für den aktuellen Markt).
          </p>
        </div>

        {!isByBlock && (
          <Alert data-tour="backshop-konfig-block-sort-disabled-hint">
            <Info className="h-4 w-4" />
            <AlertTitle>Sortierung „Nach Warengruppen“</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Die Warengruppen-Workbench nutzt effektive Gruppen am besten, wenn die Darstellung auf
                <strong> Nach Warengruppen</strong> eingestellt ist.
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={`${layoutPrefix}/backshop-layout`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Layout-Einstellungen
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div data-tour="backshop-konfig-block-sort-section">
          <BackshopWarengruppenPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}
