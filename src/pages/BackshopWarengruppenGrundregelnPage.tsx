// User: Grundregeln (bevorzugte Marke pro Block, Bulk-Markenwahl)

import { Link, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BackshopWarengruppenGrundregelnCard } from '@/components/backshop/BackshopWarengruppenGrundregelnCard'
import { getBackshopNavPrefix } from '@/lib/backshop-werbung-routes'

export function BackshopWarengruppenGrundregelnPage() {
  const location = useLocation()
  const rolePrefix = getBackshopNavPrefix(location.pathname)
  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-5xl mx-auto" data-tour="backshop-konfig-gruppenregeln-page">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gruppenregeln (Backshop)</h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Pro Warengruppe eine bevorzugte Marke wählen. Nicht bevorzugte Master-Marken werden in der Listenansicht
            ausgeblendet; Angebote der aktuellen Kalenderwoche und eigene Produkte bleiben sichtbar (siehe Listenlogik). Fein
            anpassen kannst du unter{' '}
            <Link
              className="underline"
              to={`${rolePrefix}/marken-auswahl`}
              data-tour="backshop-konfig-gruppenregeln-marken-link"
            >
              Marken-Auswahl
            </Link>
            .
          </p>
        </div>

        <BackshopWarengruppenGrundregelnCard />
      </div>
    </DashboardLayout>
  )
}
