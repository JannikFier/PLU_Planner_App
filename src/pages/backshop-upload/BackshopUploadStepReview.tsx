// Schritt 2: Nur Vergleich – Kennzahlen, Konflikte, Excel-Hinweise (ohne Warengruppen-Zuordnung).

import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Image, ArrowLeft, ArrowRight, BarChart3 } from 'lucide-react'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { formatKWLabel } from '@/lib/plu-helpers'
import {
  formatSkippedReasons,
  formatBackshopDuplicate,
  formatSameNameDifferentPlu,
} from '@/lib/backshop-upload-wizard-formatters'
import { BackshopUploadAnalysisCard } from '@/components/backshop/BackshopUploadAnalysisCard'

export function BackshopUploadStepReview() {
  const navigate = useNavigate()
  const {
    source,
    setStep,
    fileResults,
    comparison,
    targetKW,
    targetJahr,
    summary,
    hasConflicts,
  } = useBackshopUploadWizard()

  useEffect(() => {
    setStep(2)
  }, [setStep])

  if (!comparison || !summary) {
    return <Navigate to={backshopUploadWizardPath(source)} replace />
  }

  return (
    <div className="space-y-6" data-tour="backshop-upload-step-analyze">
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" />
            Vergleichsergebnis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatKWLabel(Number(targetKW), Number(targetJahr))} – Auswertung der Excel zur aktuellen Backshop-Liste.
            Im nächsten Schritt ordnen Sie Warengruppen zu.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border-2 border-border bg-gradient-to-br from-muted/60 to-muted/20 p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Übersicht</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              <div className="rounded-lg bg-card border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.total}</div>
                <div className="text-xs text-muted-foreground">Gesamt</div>
              </div>
              <div className="rounded-lg bg-card border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.unchanged}</div>
                <div className="text-xs text-muted-foreground">Unverändert</div>
              </div>
              <div className="rounded-lg bg-card border p-3 border-amber-200 bg-amber-50/80">
                <div className="text-2xl font-bold tabular-nums text-amber-900">{summary.newProducts}</div>
                <div className="text-xs text-amber-800">Neu</div>
              </div>
              <div className="rounded-lg bg-card border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.pluChanged}</div>
                <div className="text-xs text-muted-foreground">PLU geändert</div>
              </div>
              <div className="rounded-lg bg-card border p-3">
                <div className="text-2xl font-bold tabular-nums">{summary.removed}</div>
                <div className="text-xs text-muted-foreground">Entfernt</div>
              </div>
              {summary.conflicts > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                  <div className="text-2xl font-bold tabular-nums text-destructive">{summary.conflicts}</div>
                  <div className="text-xs text-destructive">Konflikte</div>
                </div>
              )}
            </div>
          </div>

          {hasConflicts && comparison && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Es gibt {comparison.conflicts.length} Konflikt(e) (gleiche PLU, anderer Name). Einspielen ist nur ohne
              Konflikte möglich. Bitte Excel anpassen oder Konflikt-Artikel prüfen.
            </div>
          )}

          {fileResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Dateien &amp; Excel-Hinweise</h3>
              <p className="text-xs text-muted-foreground">
                Die Produkt-Analyse (Zahlen oben pro Datei) gilt für die eingelesene Datei. Übersprungene Zeilen und
                doppelte PLUs: erste Spalte mit PLU gewinnt; zweites Vorkommen wird nicht erneut importiert.
              </p>
              {fileResults.map((result, index) => (
                <div key={index} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1" title={result.fileName}>
                      {result.fileName}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      {result.totalRows} gültig
                      {result.skippedRows > 0 && ` · ${result.skippedRows} übersprungen`}
                    </Badge>
                    {result.hasImageColumn && (
                      <Badge variant="outline" className="shrink-0">
                        <Image className="h-3 w-3 mr-1" />
                        Bildspalte
                      </Badge>
                    )}
                  </div>
                  <BackshopUploadAnalysisCard result={result} rowsForCsv={result.rows} compact />
                  {(result.skippedRows > 0 && result.skippedReasons) ||
                  (result.skippedDetails?.duplicatePlu && result.skippedDetails.duplicatePlu.length > 0) ||
                  (result.sameNameDifferentPlu && result.sameNameDifferentPlu.length > 0) ? (
                    <div className="text-xs text-muted-foreground space-y-1 pl-1 border-l-2 border-border">
                      {result.skippedRows > 0 && result.skippedReasons && (
                        <p>Übersprungen: {formatSkippedReasons(result.skippedReasons, result.skippedDetails)}</p>
                      )}
                      {result.skippedDetails?.duplicatePlu && result.skippedDetails.duplicatePlu.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5">
                          {result.skippedDetails.duplicatePlu.map((d, i) => (
                            <li key={i}>{formatBackshopDuplicate(d)}</li>
                          ))}
                        </ul>
                      )}
                      {result.sameNameDifferentPlu && result.sameNameDifferentPlu.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5">
                          {result.sameNameDifferentPlu.map((entry, i) => (
                            <li key={i}>{formatSameNameDifferentPlu(entry)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Keine Auffälligkeiten bei dieser Datei.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-4 pt-2">
        <Button
          variant="outline"
          onClick={() => navigate(backshopUploadWizardPath(source))}
          data-tour="backshop-upload-wizard-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Zurück zur Datei
        </Button>
        <Button
          onClick={() => {
            setStep(3)
            navigate(backshopUploadWizardPath(source, 'assign'))
          }}
          disabled={hasConflicts}
          data-tour="backshop-upload-wizard-next"
        >
          Weiter zu Warengruppen
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
