import { PLUListPageActionsMenu, type PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import type { BackshopVersion } from '@/types/database'

export type BackshopMasterListPageHeaderProps = {
  isKiosk: boolean
  snapshotReadOnly: boolean
  currentVersion: BackshopVersion | null | undefined
  isLoading: boolean
  hasNoVersion: boolean
  snapshotInvalid: boolean
  mobileMenuItems: PLUListPageActionMenuItem[]
}

export function BackshopMasterListPageHeader({
  isKiosk,
  snapshotReadOnly,
  currentVersion,
  isLoading,
  hasNoVersion,
  snapshotInvalid,
  mobileMenuItems,
}: BackshopMasterListPageHeaderProps) {
  if (isKiosk) return null

  return (
    <>
      {/* === Header: Schmal – kurzer Titel + Aktionen-Menü === */}
      <div className="lg:hidden flex items-center justify-between gap-3 min-w-0">
        <h2 className="text-base font-bold leading-snug tracking-tight min-w-0" title="PLU-Liste Backshop">
          PLU Backshop
        </h2>
        {currentVersion && !isLoading && !hasNoVersion && !snapshotInvalid && (
          <PLUListPageActionsMenu ariaLabel="Listen-Aktionen" items={mobileMenuItems} />
        )}
      </div>

      {/* === Header: Ab lg (breit) === */}
      <div className="hidden lg:block space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">PLU-Liste Backshop</h2>
        <p className="text-sm text-muted-foreground">
          {snapshotReadOnly ? (
            <>
              Eingespielter Listenstand dieser Kalenderwoche (nur Lesen). Zentralwerbung entspricht dieser KW.
            </>
          ) : (
            <>
              Aktuelle eingespielte Liste – Backshop-Produkte mit Bild, PLU und Name. Die{' '}
              <span className="font-medium text-foreground/90">hintere KW</span> in der Zeile unten steuert die
              angezeigte Zentralwerbung (wählbar, sobald Werbung für spätere Wochen existiert).
            </>
          )}
        </p>
      </div>
    </>
  )
}
