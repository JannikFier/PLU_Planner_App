import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PLUListPageActionsMenu, type PLUListPageActionMenuItem } from '@/components/plu/PLUListPageActionsMenu'
import type { Version } from '@/types/database'
import { Upload } from 'lucide-react'

export type MasterListPageHeaderProps = {
  mode: 'user' | 'admin' | 'viewer' | 'kiosk'
  snapshotReadOnly: boolean
  currentVersion: Version | null | undefined
  isLoading: boolean
  hasNoVersion: boolean
  snapshotInvalid: boolean
  mobileMenuItems: PLUListPageActionMenuItem[]
  onNeuerUploadClick: () => void
}

export function MasterListPageHeader({
  mode,
  snapshotReadOnly,
  currentVersion,
  isLoading,
  hasNoVersion,
  snapshotInvalid,
  mobileMenuItems,
  onNeuerUploadClick,
}: MasterListPageHeaderProps) {
  if (mode === 'kiosk') return null

  return (
    <>
      {/* === Header: Schmal – kompakt (Titel | Aktionen-Menü) === */}
      <div className="lg:hidden flex items-center justify-between gap-3 min-w-0">
        <h2
          className="text-[15px] font-bold leading-snug tracking-tight min-w-0"
          title="PLU Obst und Gemüse"
        >
          PLU Obst und Gemüse
          {mode === 'admin' && (
            <Badge variant="outline" className="ml-1.5 text-[10px] font-normal align-middle shrink-0">
              {snapshotReadOnly ? 'Archiv' : 'Admin'}
            </Badge>
          )}
        </h2>
        {currentVersion && !isLoading && !hasNoVersion && !snapshotInvalid && (
          <PLUListPageActionsMenu ariaLabel="Listen-Aktionen" items={mobileMenuItems} />
        )}
      </div>

      {/* === Header: Ab lg (breit) === */}
      <div className="hidden lg:flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            PLU Obst und Gemüse
            {mode === 'admin' && (
              <Badge variant="outline" className="ml-2 text-xs font-normal align-middle">
                {snapshotReadOnly ? 'Archiv' : 'Admin'}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {snapshotReadOnly
              ? 'Eingespielter Listenstand dieser Kalenderwoche (nur Lesen).'
              : `Aktuelle eingespielte Liste – ${
                  mode === 'admin'
                    ? 'verwalten und bearbeiten.'
                    : 'deine PLU-Übersicht für Obst & Gemüse.'
                }`}
          </p>
        </div>

        {mode === 'admin' && !snapshotReadOnly && (
          <div className="flex shrink-0 items-center gap-2">
            <Button onClick={onNeuerUploadClick} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Neuer Upload
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
