// Schritt 1: Excel-Dateien und Ziel-KW; nach „Vergleich starten“ → Route …/review

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Upload, FileSpreadsheet, ArrowRight, Loader2, X, Image, AlertTriangle } from 'lucide-react'
import { BackshopColumnMappingDialog } from '@/components/backshop/BackshopColumnMappingDialog'
import { ImageAssignmentDialog } from '@/components/backshop/ImageAssignmentDialog'
import { useBackshopUploadWizard } from '@/hooks/useBackshopUploadWizard'
import { backshopUploadWizardPath } from '@/lib/backshop-upload-wizard-paths'
import { BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import {
  formatSkippedReasons,
  formatBackshopDuplicate,
  formatSameNameDifferentPlu,
} from '@/lib/backshop-upload-wizard-formatters'
import { BackshopUploadAnalysisCard } from '@/components/backshop/BackshopUploadAnalysisCard'
import { ManualSupplementCarryoverBanner } from '@/components/manual-supplement/ManualSupplementCarryoverBanner'
import { BackshopManualSupplementCard } from '@/components/manual-supplement/BackshopManualSupplementCard'
import { BackshopManualSupplementList } from '@/components/manual-supplement/BackshopManualSupplementList'
import { getKWOptionsForUpload, getUploadYearOptions } from '@/lib/date-kw-utils'
import { formatKWLabel, formatKWShort } from '@/lib/plu-helpers'

export function BackshopUploadStepUpload() {
  const navigate = useNavigate()
  const {
    source,
    setStep,
    fileResults,
    removeFile,
    targetKW,
    setTargetKW,
    targetJahr,
    setTargetJahr,
    isProcessing,
    isAddingFiles,
    imageUploadProgress,
    handleFilesSelected,
    startComparison,
    overwriteConfirmOpen,
    setOverwriteConfirmOpen,
    unmatchedProducts,
    assignImageToProduct,
    columnPreview,
    openColumnMapping,
    closeColumnMapping,
    applyColumnMapping,
    imageDialogOpen,
    handleImageDialogOpenChange,
    imageAssignmentCompleted,
  } = useBackshopUploadWizard()

  const sourceMeta = BACKSHOP_SOURCE_META[source]

  useEffect(() => {
    setStep(1)
  }, [setStep])

  const goToReview = () => {
    navigate(backshopUploadWizardPath(source, 'review'))
  }

  const runComparison = async (force = false) => {
    const ok = await startComparison(force)
    if (ok) goToReview()
  }

  return (
    <>
      <div className="space-y-4 w-full" data-tour="backshop-upload-step-upload">
      <ManualSupplementCarryoverBanner listType="backshop" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {sourceMeta.label}-Excel-Dateien hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Eine oder mehrere Excel-Dateien auswählen (.xlsx oder .xls). PLU (5-stellig, bevorzugt ZWS-PLU), Name und ggf. Abbildung werden automatisch erkannt. Wenn die Erkennung unsicher ist, kannst du das Layout über „Layout prüfen / anpassen“ korrigieren. Mehrere Dateien werden zusammengeführt (PLU-Duplikate werden entfernt). Bilder werden nur aus .xlsx-Dateien übernommen; .xls liefert nur PLU und Name (Format-Einschränkung).
          </p>
          <div className="space-y-2" data-tour="backshop-upload-dropzone">
            <Label>{fileResults.length > 0 ? 'Weitere Dateien hinzufügen' : 'Dateien'}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                multiple
                disabled={isAddingFiles}
                onChange={(e) => {
                  const files = e.target.files
                  if (files?.length) handleFilesSelected(files)
                  e.target.value = ''
                }}
              />
              {isAddingFiles && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {imageUploadProgress
                    ? `Bilder werden hochgeladen (${imageUploadProgress.uploaded}/${imageUploadProgress.total})…`
                    : 'Dateien werden gelesen…'}
                </span>
              )}
            </div>
          </div>
          {fileResults.length > 0 && (
            <div className="space-y-3">
              {fileResults.map((result, index) => (
                <div key={index} className="flex flex-col gap-1 rounded-lg border p-3 bg-muted/30">
                  <p className="text-sm font-medium truncate" title={result.fileName}>
                    {result.fileName}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="secondary" className="shrink-0">
                      <FileSpreadsheet className="h-3 w-3 mr-1" />
                      {result.totalRows} Zeilen
                      {result.skippedRows > 0 && ` · ${result.skippedRows} übersprungen`}
                    </Badge>
                    {result.hasImageColumn && (
                      <Badge variant="outline" className="shrink-0">
                        <Image className="h-3 w-3 mr-1" />
                        Mit Bildspalte
                      </Badge>
                    )}
                    {result.fileName.toLowerCase().endsWith('.xls') && (
                      <Badge variant="secondary" className="shrink-0">
                        Ohne Bilder (.xls – Bilder nur aus .xlsx)
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={() => openColumnMapping(index)}
                        title="Erkanntes Excel-Layout prüfen oder manuell anpassen"
                      >
                        Layout prüfen / anpassen
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeFile(index)}
                        aria-label="Datei entfernen"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <BackshopUploadAnalysisCard result={result} rowsForCsv={result.rows} />
                  {(result.skippedRows > 0 && result.skippedReasons) ||
                  (result.sameNameDifferentPlu && result.sameNameDifferentPlu.length > 0) ? (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {result.skippedRows > 0 && result.skippedReasons && (
                        <>
                          <p>Übersprungen: {formatSkippedReasons(result.skippedReasons, result.skippedDetails)}</p>
                          {result.skippedDetails?.duplicatePlu && result.skippedDetails.duplicatePlu.length > 0 && (
                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                              {result.skippedDetails.duplicatePlu.map((d, i) => (
                                <li key={i}>{formatBackshopDuplicate(d)}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                      {result.sameNameDifferentPlu && result.sameNameDifferentPlu.length > 0 && (
                        <>
                          <p className="mt-1 font-medium">Gleiche Bezeichnung, verschiedene PLU (in Excel prüfen):</p>
                          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                            {result.sameNameDifferentPlu.map((entry, i) => (
                              <li key={i}>{formatSameNameDifferentPlu(entry)}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {fileResults.some((r) => r.skippedRows > 0) && (
                <p className="text-xs text-muted-foreground">
                  Fehlt ein Produkt: in der Excel prüfen (PLU genau 5 Ziffern, Name gesetzt). Die Produkt-Analyse zeigt
                  importierte PLUs vs. Duplikate; doppelte PLU = nur die erste Spalte. Positionen wie in Excel (z. B. C7 =
                  Spalte C, Zeile 7).
                </p>
              )}
              {unmatchedProducts.length > 0 && (
                <div className="rounded-lg border px-4 py-3 text-sm border-amber-200 bg-amber-50 text-amber-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{unmatchedProducts.length} Produkt(e) ohne Bild:</p>
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {unmatchedProducts.slice(0, 10).map((p) => (
                          <li key={p.plu}>
                            {p.name} <span className="text-amber-600">({p.plu})</span>
                          </li>
                        ))}
                        {unmatchedProducts.length > 10 && (
                          <li className="text-amber-600">… und {unmatchedProducts.length - 10} weitere</li>
                        )}
                      </ul>
                      <p className="mt-1.5 text-xs text-amber-600">
                        Diese Produkte haben in der Excel kein eigenes Bild an der erwarteten Position.
                      </p>
                    </div>
                  </div>
                  {unmatchedProducts.some((p) => p.availableImages.length > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-300 text-amber-800 hover:bg-amber-100"
                      onClick={() => handleImageDialogOpenChange(true)}
                    >
                      Bilder manuell zuordnen
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
          <ImageAssignmentDialog
            open={imageDialogOpen}
            onOpenChange={handleImageDialogOpenChange}
            products={unmatchedProducts}
            onAssign={assignImageToProduct}
            onSkipAll={() => handleImageDialogOpenChange(false)}
          />
          <BackshopColumnMappingDialog
            open={!!columnPreview}
            onOpenChange={(open) => {
              if (!open) closeColumnMapping()
            }}
            preview={columnPreview?.preview ?? null}
            parseResult={columnPreview?.parseResult ?? null}
            previewFile={columnPreview?.file ?? null}
            onConfirm={applyColumnMapping}
          />
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <Label>Ziel-KW</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={targetKW}
                onChange={(e) => setTargetKW(e.target.value)}
              >
                <option value="">KW wählen</option>
                {getKWOptionsForUpload().map((kw) => (
                  <option key={kw} value={String(kw)}>
                    {formatKWShort(kw)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Jahr</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={targetJahr}
                onChange={(e) => setTargetJahr(e.target.value)}
              >
                {getUploadYearOptions().map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => runComparison()}
            disabled={
              isProcessing ||
              fileResults.length === 0 ||
              !targetKW ||
              (unmatchedProducts.length > 0 && !imageAssignmentCompleted)
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vergleich läuft…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" /> Vergleich starten
              </>
            )}
          </Button>

          <AlertDialog open={overwriteConfirmOpen} onOpenChange={setOverwriteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{sourceMeta.label}-Daten für diese KW schon vorhanden</AlertDialogTitle>
                <AlertDialogDescription>
                  Für {formatKWLabel(Number(targetKW), Number(targetJahr))} existieren bereits {sourceMeta.label}
                  -Daten. Nur die {sourceMeta.label}-Zeilen werden ersetzt; die anderen Marken bleiben unverändert.
                  Fortfahren oder eine andere Ziel-KW wählen?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ziel-KW ändern</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    void runComparison(true)
                  }}
                >
                  {sourceMeta.label}-Daten ersetzen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      <BackshopManualSupplementCard />
      <BackshopManualSupplementList />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Nach dem Start öffnet sich der Vergleich auf einer eigenen Seite – Schritt für Schritt bis zum Einspielen.
      </p>
    </>
  )
}
