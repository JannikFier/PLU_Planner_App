// BlockSortPage: Fullscreen-artige Seite zum Sortieren von Blöcken und Produkten

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InteractivePLUTable } from '@/components/plu/InteractivePLUTable'

export function BlockSortPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
            <h2 className="text-2xl font-bold tracking-tight">
              PLU-Liste bearbeiten
            </h2>
            <p className="text-sm text-muted-foreground">
              Ziehe ganze Warengruppen oder einzelne Produkte per Drag & Drop an die gewünschte Position.
            </p>
        </div>

        {/* Interaktive Tabelle */}
        <InteractivePLUTable />
      </div>
    </DashboardLayout>
  )
}
