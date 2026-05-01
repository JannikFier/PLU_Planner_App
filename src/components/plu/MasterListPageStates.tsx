import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Archive, AlertCircle, Info, ListFilter, RefreshCw, Upload } from 'lucide-react'

/** Archiv-Banner (Super-Admin Snapshot). */
export function MasterListArchiveAlert({ kwLabel }: { kwLabel: string }) {
  return (
    <Alert>
      <Archive className="h-4 w-4" />
      <AlertTitle>Archivansicht</AlertTitle>
      <AlertDescription>
        Liste und Werbung beziehen sich auf{' '}
        <span className="font-medium text-foreground">{kwLabel}</span>. Bearbeiten ist hier deaktiviert.
      </AlertDescription>
    </Alert>
  )
}

export function MasterListSnapshotInvalidCard({ onBack }: { onBack: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium mb-1">Version nicht gefunden</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Diese Version gibt es nicht oder wurde gelöscht.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Zurück zu Versionen
        </Button>
      </CardContent>
    </Card>
  )
}

export function MasterListWgSortHintAlert(options: {
  showAdminLayoutLink: boolean
  layoutSettingsHref: string
  onBeforeNavigate: () => void
}) {
  const { showAdminLayoutLink, layoutSettingsHref, onBeforeNavigate } = options
  return (
    <Alert data-testid="masterlist-wg-sort-hint">
      <Info className="h-4 w-4" />
      <AlertTitle>Markt-Zuordnungen zu Warengruppen</AlertTitle>
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Für diesen Markt gibt es Zuordnungen aus der Warengruppen-Workbench. Bei Sortierung{' '}
          <strong>Alphabetisch (A–Z)</strong> erscheinen keine Warengruppen-Abschnitte – Artikel stehen nur alphabetisch.
          Stellen Sie in den Layout-Einstellungen (Obst) die Sortierung auf{' '}
          <strong>Nach Warengruppen</strong>, um Gruppen und Zuordnungen wie in der Workbench zu sehen.
        </span>
        {showAdminLayoutLink ? (
          <Button variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
            <Link to={layoutSettingsHref} onClick={onBeforeNavigate}>
              Layout-Einstellungen (Obst)
            </Link>
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground shrink-0">
            Bitte eine Person mit Admin-Rechten: Sortierung „Nach Warengruppen“ im Layout (Obst) setzen.
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function MasterListNoVersionCard(options: {
  showUploadButton: boolean
  onUploadClick: () => void
}) {
  const { showUploadButton, onUploadClick } = options
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">Keine Kalenderwoche vorhanden</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          Es wurde noch keine PLU-Liste hochgeladen. Lade zuerst eine Excel-Datei über PLU Upload hoch.
        </p>
        {showUploadButton && (
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Zum PLU Upload
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function MasterListLoadingSkeletonCard() {
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

export function MasterListPluErrorCard(options: {
  message: string
  onRetry: () => void
}) {
  const { message, onRetry } = options
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Fehler beim Laden der PLU-Daten</p>
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

export function MasterListEmptyDataCard({ isAdminMode }: { isAdminMode: boolean }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <ListFilter className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">Keine PLU-Daten vorhanden</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {isAdminMode
            ? 'Lade eine Excel-Datei hoch, um die PLU-Liste für diese KW zu erstellen.'
            : 'Für diese Kalenderwoche wurden noch keine PLU-Daten hochgeladen.'}
        </p>
      </CardContent>
    </Card>
  )
}
