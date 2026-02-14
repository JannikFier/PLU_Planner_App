// BlockSortPage: Fullscreen-artige Seite zum Sortieren von Blöcken und Produkten

import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InteractivePLUTable } from '@/components/plu/InteractivePLUTable'

export function BlockSortPage() {
  const navigate = useNavigate()

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              PLU-Liste bearbeiten
            </h2>
            <p className="text-sm text-muted-foreground">
              Ziehe ganze Warengruppen oder einzelne Produkte per Drag & Drop an die gewünschte Position.
            </p>
          </div>
        </div>

        {/* Interaktive Tabelle */}
        <InteractivePLUTable />
      </div>
    </DashboardLayout>
  )
}
