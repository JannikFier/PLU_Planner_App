import type { RefObject } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PLUTableHandle } from '@/components/plu/PLUTable'
import type { Version } from '@/types/database'
import { EyeOff, FileDown, LayoutGrid, ListFilter, Megaphone, Pencil, Plus, Search } from 'lucide-react'

export type MasterListToolbarProps = {
  mode: 'user' | 'admin' | 'viewer' | 'kiosk'
  currentVersion: Version
  sortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  displayMode: 'MIXED' | 'SEPARATED'
  versionDisplayKwLabel: string
  readOnlyListMode: boolean
  snapshotReadOnly: boolean
  featuresCustomProducts: boolean
  rolePrefix: string
  backTo: string
  navigate: NavigateFunction
  pluTableRef: RefObject<PLUTableHandle | null>
  onBeforeNavigate: () => void
  onOpenPdfDialog: () => void
}

export function MasterListToolbar({
  mode,
  currentVersion,
  sortMode,
  displayMode,
  versionDisplayKwLabel,
  readOnlyListMode,
  snapshotReadOnly,
  featuresCustomProducts,
  rolePrefix,
  backTo,
  navigate,
  pluTableRef,
  onBeforeNavigate,
  onOpenPdfDialog,
}: MasterListToolbarProps) {
  const go = (relativePath: string) => {
    onBeforeNavigate()
    navigate(relativePath, { state: { backTo } })
  }

  return (
    <div
      className="flex w-full flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-between"
      data-tour="obst-master-toolbar"
    >
      {/* Links: Suche + Infos (min-w-0 damit Text schrumpft statt Aktionen zu verdrängen) */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          data-tour="masterlist-search"
          data-plu-find-in-page-trigger
          onClick={() => pluTableRef.current?.openFindInPage()}
          aria-label="In Liste suchen"
          title="In Liste suchen (PLU oder Name)"
        >
          <Search className="h-4 w-4" />
        </Button>
        {/* Anzeige-Infos: Sortierung, Darstellung (Stück/Gewicht), KW, Aktiv */}
        <div
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:max-w-none"
          data-tour="masterlist-context-line"
        >
          <ListFilter className="h-4 w-4 shrink-0" />
          <span title="Layout-Sortierung">
            {sortMode === 'BY_BLOCK' ? 'Nach Warengruppen' : 'Alphabetisch (A–Z)'}
          </span>
          <span className="text-border">|</span>
          <span title="Layout-Anzeige Stück/Gewicht">
            {displayMode === 'MIXED' ? 'Stück + Gewicht gemischt' : 'Nach Typ getrennt'}
          </span>
          <span className="text-border">|</span>
          <span
            className="text-foreground font-medium"
            title="Stammdaten aus zuletzt eingespielter Liste (wechselt nur bei neuem Upload)"
          >
            Liste {versionDisplayKwLabel}
          </span>
          {currentVersion.status === 'active' && (
            <Badge variant="default" className="text-xs">
              Aktiv
            </Badge>
          )}
          {currentVersion.status === 'frozen' && (
            <Badge variant="outline" className="text-xs">
              Archiv
            </Badge>
          )}
        </div>
      </div>

      {/* Rechts: Aktionen ab lg (eine Zeile, rechtsbündig) */}
      <div className="hidden lg:flex shrink-0 flex-nowrap items-center gap-2" data-tour="masterlist-toolbar-actions">
        {!readOnlyListMode && !snapshotReadOnly && (
          <>
            {featuresCustomProducts && (
              <Button
                variant="outline"
                size="sm"
                data-tour="masterlist-toolbar-eigene-produkte"
                onClick={() =>
                  go(`${rolePrefix}/custom-products?backTo=${encodeURIComponent(backTo)}`)
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Eigene Produkte
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              data-tour="masterlist-toolbar-ausgeblendete"
              onClick={() =>
                go(`${rolePrefix}/hidden-products?backTo=${encodeURIComponent(backTo)}`)
              }
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Ausgeblendete
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-tour="masterlist-toolbar-werbung"
              onClick={() =>
                go(`${rolePrefix}/offer-products?backTo=${encodeURIComponent(backTo)}`)
              }
            >
              <Megaphone className="h-4 w-4 mr-1" />
              Werbung
            </Button>
          </>
        )}
        {!readOnlyListMode && !snapshotReadOnly && (
          <Button
            variant="outline"
            size="sm"
            data-tour="masterlist-toolbar-umbenennen"
            onClick={() =>
              go(`${rolePrefix}/renamed-products?backTo=${encodeURIComponent(backTo)}`)
            }
          >
            <Pencil className="h-4 w-4 mr-1" />
            Umbenennen
          </Button>
        )}
        {sortMode === 'BY_BLOCK' && !readOnlyListMode && !snapshotReadOnly && (
          <Button
            variant="outline"
            size="sm"
            data-tour="masterlist-toolbar-warengruppen"
            onClick={() =>
              go(`${rolePrefix}/obst-warengruppen?backTo=${encodeURIComponent(backTo)}`)
            }
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Warengruppen
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          data-tour="masterlist-toolbar-pdf"
          onClick={() => {
            onBeforeNavigate()
            onOpenPdfDialog()
          }}
        >
          <FileDown className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>
      {/* Viewer: PDF auf dem Handy ohne ⋮-Menü */}
      {mode === 'viewer' && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 lg:hidden"
          onClick={() => {
            onBeforeNavigate()
            onOpenPdfDialog()
          }}
        >
          <FileDown className="h-4 w-4 mr-1" />
          PDF
        </Button>
      )}
    </div>
  )
}
