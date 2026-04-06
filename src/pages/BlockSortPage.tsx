// BlockSortPage: Fullscreen-artige Seite zum Sortieren von Blöcken und Produkten (Obst/Gemüse)

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InteractivePLUTable } from '@/components/plu/InteractivePLUTable'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { obstCustomProductShowBlockField } from '@/lib/obst-custom-product-layout'

export function BlockSortPage() {
  const { data: layoutSettings } = useLayoutSettings()
  const showWarengruppenSortierung = obstCustomProductShowBlockField(layoutSettings)

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

        {showWarengruppenSortierung ? (
          <InteractivePLUTable />
        ) : (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Diese Ansicht ist nur aktiv, wenn im Layout für diesen Markt unter{' '}
            <strong className="font-medium text-foreground">Sortierung</strong> die Option{' '}
            <span className="font-medium text-foreground">Nach Warengruppen</span> gewählt ist (Layout-Konfiguration
            dieses Marktes).
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
