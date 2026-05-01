import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Archive, AlertCircle, Info, ListFilter, RefreshCw } from 'lucide-react'

export function BackshopMasterListArchiveAlert({ kwLabel }: { kwLabel: string }) {
  return (
    <Alert data-tour="backshop-master-version-banner">
      <Archive className="h-4 w-4" />
      <AlertTitle>Archivansicht</AlertTitle>
      <AlertDescription>
        Liste und Werbung beziehen sich auf{' '}
        <span className="font-medium text-foreground">{kwLabel}</span>. Bearbeiten ist hier deaktiviert.
      </AlertDescription>
    </Alert>
  )
}

export function BackshopMasterListSnapshotInvalidCard({ onBack }: { onBack: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium mb-1">Version nicht gefunden</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Diese Backshop-Version gibt es nicht oder wurde gelöscht.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Zurück zu Backshop-Versionen
        </Button>
      </CardContent>
    </Card>
  )
}

export function BackshopMasterListWgSortHintAlert(options: {
  showAdminLayoutLink: boolean
  layoutSettingsHref: string
  onBeforeNavigate: () => void
}) {
  const { showAdminLayoutLink, layoutSettingsHref, onBeforeNavigate } = options
  return (
    <Alert data-testid="backshop-masterlist-wg-sort-hint">
      <Info className="h-4 w-4" />
      <AlertTitle>Markt-Zuordnungen zu Warengruppen (Backshop)</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Für diesen Markt gibt es Zuordnungen aus der Backshop-Warengruppen-Workbench. Bei Sortierung{' '}
          <strong>Alphabetisch (A–Z)</strong> erscheinen keine Warengruppen-Abschnitte. Stellen Sie in den
          Layout-Einstellungen (Backshop) die Sortierung auf <strong>Nach Warengruppen</strong>, um Gruppen sichtbar zu
          machen.
        </span>
        {showAdminLayoutLink ? (
          <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
            <Link to={layoutSettingsHref} onClick={onBeforeNavigate}>
              Layout-Einstellungen (Backshop)
            </Link>
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground shrink-0">
            Bitte eine Person mit Admin-Rechten: Sortierung „Nach Warengruppen“ im Layout (Backshop) setzen.
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function BackshopMasterListNoVersionCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">Keine Backshop-Version vorhanden</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Es wurde noch keine Backshop-Liste hochgeladen. Nutze „Backshop Upload“ im Super-Admin-Bereich.
        </p>
      </CardContent>
    </Card>
  )
}

export function BackshopMasterListLoadingSkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="flex gap-4">
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 flex-1" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function BackshopMasterListItemsErrorCard(options: { message: string; onRetry: () => void }) {
  const { message, onRetry } = options
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Fehler beim Laden der Backshop-Daten</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut versuchen
        </Button>
      </CardContent>
    </Card>
  )
}

export function BackshopMasterListEmptyDataCard(options: {
  snapshotSourceOnly: boolean
  rawItemsLength: number
  sourceLabel: string
}) {
  const { snapshotSourceOnly, rawItemsLength, sourceLabel } = options
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">
          {snapshotSourceOnly && rawItemsLength > 0 ? `Keine PLUs für ${sourceLabel}` : 'Keine Backshop-Daten für diese KW'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {snapshotSourceOnly && rawItemsLength > 0
            ? 'In dieser Kalenderwoche gibt es für diese Marke keine Master-PLU-Zeilen.'
            : 'Für diese Kalenderwoche wurden noch keine Backshop-PLU-Daten hochgeladen.'}
        </p>
      </CardContent>
    </Card>
  )
}

export function BackshopMasterListSourceFilterAlert(options: {
  sourceLabel: string
  kwLabel: string
  onClearSource: () => void
}) {
  const { sourceLabel, kwLabel, onClearSource } = options
  return (
    <Alert data-tour="backshop-master-source-filter">
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Nur Quelle: {sourceLabel}
        <span className="text-muted-foreground font-normal text-sm">({kwLabel})</span>
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2 mt-2">
        Es werden nur PLUs dieser Marke angezeigt.
        <Button type="button" variant="outline" size="sm" onClick={onClearSource}>
          Gesamte KW anzeigen
        </Button>
      </AlertDescription>
    </Alert>
  )
}
