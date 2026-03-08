// BackshopWarengruppenPage: Eigene Seite zum Zuordnen von Produkten zu Warengruppen (Backshop)

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BackshopWarengruppenPanel } from '@/components/plu/BackshopWarengruppenPanel'

export function BackshopWarengruppenPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warengruppen bearbeiten</h2>
          <p className="text-sm text-muted-foreground">
            Produkte per Suche und Mehrfachauswahl den Warengruppen zuordnen. Links die Gruppen, rechts die Zuordnung.
          </p>
        </div>

        <BackshopWarengruppenPanel />
      </div>
    </DashboardLayout>
  )
}
