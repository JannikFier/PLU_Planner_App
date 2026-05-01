import type { RefObject } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PLUTableHandle } from '@/components/plu/PLUTable'
import type { BackshopVersion } from '@/types/database'
import {
  formatIsoWeekMondayToSaturdayDe,
  type BackshopToolbarWerbungLayout,
} from '@/lib/date-kw-utils'
import { cn } from '@/lib/utils'
import {
  EyeOff,
  FileDown,
  GitCompareArrows,
  ListFilter,
  Megaphone,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'

export type BackshopMasterListToolbarProps = {
  isKiosk: boolean
  isViewer: boolean
  pluTableRef: RefObject<PLUTableHandle | null>
  werbungToolbarLayout: BackshopToolbarWerbungLayout | null
  currentVersion: BackshopVersion
  showWeekMonSat: boolean
  showWerbungKwDropdown: boolean
  calendarKw: number
  forwardWerbungSlots: Array<{ kw: number; jahr: number }>
  offerPreviewSelectValue: string
  onOfferPreviewChange: (v: string) => void
  listReadOnly: boolean
  snapshotReadOnly: boolean
  isSuperAdminCentralBackshopMasterView: boolean
  isSuperAdmin: boolean
  pathname: string
  rolePrefix: string
  backTo: string
  navigate: NavigateFunction
  onBeforeNavigate: () => void
  openPdfDialog: () => void
  pdfDisabled: boolean
  hasNoVersion: boolean
  isLoading: boolean
  displayItemsLength: number
}

export function BackshopMasterListToolbar({
  isKiosk,
  isViewer,
  pluTableRef,
  werbungToolbarLayout,
  currentVersion,
  showWeekMonSat,
  showWerbungKwDropdown,
  calendarKw,
  forwardWerbungSlots,
  offerPreviewSelectValue,
  onOfferPreviewChange,
  listReadOnly,
  snapshotReadOnly,
  isSuperAdminCentralBackshopMasterView,
  isSuperAdmin,
  pathname,
  rolePrefix,
  backTo,
  navigate,
  onBeforeNavigate,
  openPdfDialog,
  pdfDisabled,
  hasNoVersion,
  isLoading,
  displayItemsLength,
}: BackshopMasterListToolbarProps) {
  const go = (pathAfterPrefix: string) => {
    onBeforeNavigate()
    navigate(`${rolePrefix}${pathAfterPrefix}?backTo=${encodeURIComponent(backTo)}`, { state: { backTo } })
  }

  const viewerPdfDisabled = isLoading || displayItemsLength === 0

  return (
    <div className="space-y-3" data-tour="backshop-master-toolbar">
      {/* Zeile 1: Liste, Werbung/KW, Status – eine klare Kontextzeile */}
      <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 lg:flex-nowrap lg:items-center lg:gap-2">
        {!isKiosk && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            data-tour="backshop-master-find-trigger"
            data-plu-find-in-page-trigger
            onClick={() => pluTableRef.current?.openFindInPage()}
            aria-label="In Liste suchen"
            title="In Liste suchen (PLU oder Name)"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground lg:flex-nowrap lg:items-center lg:gap-x-2 lg:gap-y-0">
          <ListFilter className="h-4 w-4 shrink-0" aria-hidden />
          {werbungToolbarLayout && currentVersion ? (
            <BackshopToolbarWerbungRangeLine
              layout={werbungToolbarLayout}
              showWeekMonSat={showWeekMonSat}
              uploadKw={currentVersion.kw_nummer}
              uploadYear={currentVersion.jahr}
              showDropdown={showWerbungKwDropdown}
              calendarKw={calendarKw}
              forwardSlots={forwardWerbungSlots}
              selectValue={offerPreviewSelectValue}
              onSelectChange={onOfferPreviewChange}
            />
          ) : null}
          {currentVersion.status === 'active' && (
            <Badge variant="default" className="shrink-0 text-xs">
              Aktiv
            </Badge>
          )}
          {currentVersion.status === 'frozen' && (
            <Badge variant="outline" className="shrink-0 text-xs">
              Archiv
            </Badge>
          )}
        </div>
      </div>

      {/* Zeile 2: Aktionen als Block rechtsbündig; ab lg (Handy/Tablet: Menü im Header) */}
      <div className="hidden w-full min-w-0 border-t border-border/60 pt-3 lg:flex lg:justify-end">
        {!listReadOnly && !snapshotReadOnly && (
          <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isSuperAdminCentralBackshopMasterView && (
                <Button
                  variant="outline"
                  size="sm"
                  data-tour="backshop-master-quick-custom"
                  onClick={() => go('/backshop-custom-products')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Eigene Produkte
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                data-tour="backshop-master-quick-hidden"
                onClick={() => go('/backshop-hidden-products')}
              >
                <EyeOff className="h-4 w-4 mr-1" />
                Ausgeblendete
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-tour="backshop-master-quick-offer"
                onClick={() => go('/backshop-offer-products')}
              >
                <Megaphone className="h-4 w-4 mr-1" />
                Werbung
              </Button>
              {isSuperAdmin && pathname.startsWith('/super-admin') && (
                <Button variant="outline" size="sm" onClick={() => go('/backshop-warengruppen')}>
                  Warengruppen bearbeiten
                </Button>
              )}
            </div>
            <div className="h-4 w-px shrink-0 bg-border self-center" aria-hidden />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => go('/marken-auswahl')}>
                <GitCompareArrows className="h-4 w-4 mr-1" />
                Marken-Auswahl
              </Button>
              <Button variant="outline" size="sm" onClick={() => go('/backshop-renamed-products')}>
                <Pencil className="h-4 w-4 mr-1" />
                Umbenennen
              </Button>
            </div>
            {!hasNoVersion && (
              <Button
                variant="outline"
                size="sm"
                data-tour="backshop-master-pdf-export"
                onClick={openPdfDialog}
                disabled={pdfDisabled}
              >
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
        )}
        {!listReadOnly && snapshotReadOnly && !hasNoVersion && (
          <Button
            variant="outline"
            size="sm"
            data-tour="backshop-master-pdf-export"
            onClick={openPdfDialog}
            disabled={pdfDisabled}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        )}
        {isViewer && !hasNoVersion && (
          <Button
            variant="outline"
            size="sm"
            data-tour="backshop-master-pdf-export"
            onClick={openPdfDialog}
            disabled={viewerPdfDisabled}
          >
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        )}
      </div>

      {isViewer && !hasNoVersion && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 lg:hidden"
          data-tour="backshop-master-pdf-export"
          onClick={openPdfDialog}
          disabled={viewerPdfDisabled}
        >
          <FileDown className="h-4 w-4 mr-1" />
          PDF
        </Button>
      )}
    </div>
  )
}

/** Toolbar-Zeile „KW … – KW …“: nur die hintere KW als schmales Dropdown (nach vorn). */
function BackshopToolbarWerbungRangeLine({
  layout,
  showWeekMonSat,
  uploadKw,
  uploadYear,
  showDropdown,
  calendarKw,
  forwardSlots,
  selectValue,
  onSelectChange,
}: {
  layout: BackshopToolbarWerbungLayout
  showWeekMonSat: boolean
  uploadKw: number
  uploadYear: number
  showDropdown: boolean
  calendarKw: number
  forwardSlots: Array<{ kw: number; jahr: number }>
  selectValue: string
  onSelectChange: (v: string) => void
}) {
  const triggerClass = cn(
    'h-6 min-h-6 w-fit min-w-[2.25rem] max-w-[4.5rem] shrink-0 justify-center gap-0.5 border-0 bg-transparent px-1 py-0 shadow-none',
    'text-sm font-semibold text-foreground [&_svg]:h-3 [&_svg]:w-3 [&_svg]:opacity-60',
    '*:data-[slot=select-value]:tabular-nums',
    showDropdown && 'cursor-pointer hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring',
  )

  const kwControl = (staticKw: number) =>
    showDropdown ? (
      <Select value={selectValue} onValueChange={onSelectChange}>
        <SelectTrigger
          size="sm"
          className={triggerClass}
          aria-label="Werbungs-Kalenderwoche wählen"
          title="Standard: aktuelle Kalenderwoche (automatische Werbung wie bisher). Weitere Einträge: spätere Wochen mit hochgeladener Angebotsdatei."
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" position="popper" className="min-w-[3rem]">
          <SelectItem value="auto" className="tabular-nums">
            {calendarKw}
          </SelectItem>
          {forwardSlots.map((s) => (
            <SelectItem key={`${s.jahr}-${s.kw}`} value={`${s.jahr}:${s.kw}`} className="tabular-nums">
              {s.kw}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <span className="font-semibold tabular-nums text-foreground">{staticKw}</span>
    )

  const line = (() => {
    if (layout.variant === 'single_line') {
      return (
        <>
          <span className="font-medium text-foreground">{layout.prefixBeforeKw}</span>
          {kwControl(layout.highlightKw)}
          <span className="font-medium text-foreground">{layout.suffixAfterKw}</span>
        </>
      )
    }
    if (layout.variant === 'range_same_year') {
      return (
        <>
          <span className="font-medium text-foreground">{layout.prefixBeforeEndKw}</span>
          {kwControl(layout.endKw)}
          <span className="font-medium text-foreground">{layout.suffix}</span>
        </>
      )
    }
    return (
      <>
        <span className="font-medium text-foreground">{layout.leftFixed}</span>
        {kwControl(layout.endKw)}
        <span className="font-medium text-foreground">{layout.suffix}</span>
      </>
    )
  })()

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-0.5 text-sm font-medium">
      {line}
      {showWeekMonSat && (
        <span className="text-muted-foreground font-normal">
          {' '}
          · {formatIsoWeekMondayToSaturdayDe(uploadKw, uploadYear)}
        </span>
      )}
    </span>
  )
}
