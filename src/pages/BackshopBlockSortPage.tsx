// BackshopBlockSortPage: Fullscreen-artige Seite zum Sortieren von Backshop-Blöcken und Produkten

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InteractiveBackshopPLUTable } from '@/components/plu/InteractiveBackshopPLUTable'

export function BackshopBlockSortPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">PLU-Liste Backshop bearbeiten</h2>
            <p className="text-sm text-muted-foreground">
              Ziehe Warengruppen oder einzelne Produkte per Drag & Drop an die gewünschte Position.
            </p>
        </div>

        <InteractiveBackshopPLUTable />
      </div>
    </DashboardLayout>
  )
}
