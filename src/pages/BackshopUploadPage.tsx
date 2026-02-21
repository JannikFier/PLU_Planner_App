// BackshopUploadPage – 3-Schritt Backshop-Excel-Upload

import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
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
import { Upload, FileSpreadsheet, CheckCircle2, ArrowLeft, ArrowRight, Loader2, X, Image } from 'lucide-react'
import { useBackshopUpload } from '@/hooks/useBackshopUpload'
import { PLUTable } from '@/components/plu/PLUTable'
import { getKWOptionsForUpload, getUploadYearOptions } from '@/lib/date-kw-utils'
import { formatKWLabel, formatKWShort } from '@/lib/plu-helpers'
import type {
  DisplayItem,
  BackshopSkippedReasons,
  BackshopSkippedDetails,
  BackshopSkippedPosition,
  BackshopDuplicateDetail,
  SameNameDifferentPluEntry,
} from '@/types/plu'

/** Spalte 1-basiert → Excel-Buchstabe (1=A, 2=B, …, 26=Z, 27=AA). */
function colToLetter(col1: number): string {
  let n = col1
  let s = ''
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

/** Kompakt: Buchstabe + Zeile wie in Excel (z. B. C7, AR22). */
function positionCompact(row: number, col: number): string {
  return colToLetter(col) + row
}

/** Formatiert eine Position für ungültige PLU / leerer Name (kompakt). */
function formatPosition(pos: BackshopSkippedPosition): string {
  return positionCompact(pos.row, pos.col)
}

/** Formatiert ein Duplikat: PLU + erstes Mal (C7) + doppelt (AR22). */
function formatDuplicate(d: BackshopDuplicateDetail): string {
  const first = positionCompact(d.firstRow, d.firstCol)
  const dup = positionCompact(d.row, d.col)
  return `PLU ${d.plu}: ${first} (erstes Mal), ${dup} (doppelt)`
}

/** Formatiert „Gleiche Bezeichnung, verschiedene PLU“: Name + jede PLU mit Position (C7). */
function formatSameNameDifferentPlu(entry: SameNameDifferentPluEntry): string {
  const parts = entry.occurrences.map((o) => `PLU ${o.plu} in ${positionCompact(o.row, o.col)}`)
  return `${entry.name}: ${parts.join('; ')}`
}

/** Formatiert die Aufschlüsselung inkl. Zeile/Spalte zum Nachschlagen. */
function formatSkippedReasons(
  reasons: BackshopSkippedReasons,
  details?: BackshopSkippedDetails
): string {
  const parts: string[] = []
  if (reasons.invalidPlu > 0) {
    const posList = details?.invalidPlu?.map(formatPosition).join('; ') ?? ''
    parts.push(posList ? `${reasons.invalidPlu}× ungültige PLU (${posList})` : `${reasons.invalidPlu}× ungültige PLU`)
  }
  if (reasons.emptyName > 0) {
    const posList = details?.emptyName?.map(formatPosition).join('; ') ?? ''
    parts.push(posList ? `${reasons.emptyName}× leerer Name/Platzhalter (${posList})` : `${reasons.emptyName}× leerer Name/Platzhalter`)
  }
  if (reasons.duplicatePlu > 0) {
    parts.push(`${reasons.duplicatePlu}× doppelte PLU`)
  }
  return parts.join('. ')
}

/** BackshopCompareItem zu DisplayItem für PLUTable-Vorschau */
function backshopItemsToDisplayItems(items: import('@/types/plu').BackshopCompareItem[]): DisplayItem[] {
  return items
    .map((item) => ({
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: item.display_name ?? item.system_name,
      item_type: 'PIECE' as const,
      status: item.status as DisplayItem['status'],
      old_plu: item.old_plu,
      warengruppe: null,
      block_id: null,
      block_name: null,
      preis: null,
      is_custom: false,
      is_manually_renamed: false,
      image_url: item.image_url ?? undefined,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name, 'de'))
}

export function BackshopUploadPage() {
  const navigate = useNavigate()
  const {
    step,
    setStep,
    fileResults,
    removeFile,
    targetKW,
    setTargetKW,
    targetJahr,
    setTargetJahr,
    comparison,
    isProcessing,
    isAddingFiles,
    imageUploadProgress,
    publishResult,
    reset,
    handleFilesSelected,
    startComparison,
    handlePublish,
    overwriteConfirmOpen,
    setOverwriteConfirmOpen,
  } = useBackshopUpload()

  const previewDisplayItems = useMemo(() => {
    if (step !== 2 || !comparison?.allItems?.length) return []
    return backshopItemsToDisplayItems(comparison.allItems)
  }, [step, comparison])

  const summary = comparison?.summary
  const hasConflicts = (comparison?.conflicts?.length ?? 0) > 0

  const handleFinish = () => {
    reset()
    navigate('/super-admin/backshop-list')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-8rem)] w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold tracking-tight">Backshop Upload</h2>
          <Badge variant="outline">Schritt {step}/3</Badge>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Backshop-Excel-Dateien hochladen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Eine oder mehrere Excel-Dateien auswählen (.xlsx oder .xls). PLU (5-stellig), Name (Warentext) und ggf. Abbildung werden erkannt. Mehrere Dateien werden zusammengeführt (PLU-Duplikate werden entfernt). Bilder werden nur aus .xlsx-Dateien übernommen; .xls liefert nur PLU und Name (Format-Einschränkung).
              </p>
              <div className="space-y-2">
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
                    <div
                      key={index}
                      className="flex flex-col gap-1 rounded-lg border p-3 bg-muted/30"
                    >
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 ml-auto"
                          onClick={() => removeFile(index)}
                          aria-label="Datei entfernen"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {(result.skippedRows > 0 && result.skippedReasons) || (result.sameNameDifferentPlu && result.sameNameDifferentPlu.length > 0) ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {result.skippedRows > 0 && result.skippedReasons && (
                            <>
                              <p>Übersprungen: {formatSkippedReasons(result.skippedReasons, result.skippedDetails)}</p>
                              {result.skippedDetails?.duplicatePlu && result.skippedDetails.duplicatePlu.length > 0 && (
                                <ul className="list-disc list-inside mt-1 space-y-0.5">
                                  {result.skippedDetails.duplicatePlu.map((d, i) => (
                                    <li key={i}>{formatDuplicate(d)}</li>
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
                      Fehlt dir ein Produkt: in der Excel prüfen, ob PLU genau 5 Ziffern hat und ein Name eingetragen ist; doppelte PLU = nur erste Zeile wird übernommen. Positionen wie in Excel (z. B. C7 = Spalte C, Zeile 7).
                    </p>
                  )}
                </div>
              )}
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
                      <option key={kw} value={String(kw)}>{formatKWShort(kw)}</option>
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
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => startComparison()}
                disabled={isProcessing || fileResults.length === 0 || !targetKW}
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vergleich läuft...</>
                ) : (
                  <><ArrowRight className="h-4 w-4 mr-2" /> Vergleich starten</>
                )}
              </Button>

              <AlertDialog open={overwriteConfirmOpen} onOpenChange={setOverwriteConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>KW bereits vorhanden</AlertDialogTitle>
                    <AlertDialogDescription>
                      {formatKWLabel(Number(targetKW), Number(targetJahr))} existiert bereits für Backshop.
                      Überschreiben oder andere Ziel-KW wählen?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Ziel-KW ändern</AlertDialogCancel>
                    <AlertDialogAction onClick={() => startComparison(true)}>Überschreiben</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {step === 2 && summary && (
          <Card>
            <CardHeader>
              <CardTitle>Vergleichsergebnis Backshop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
                  <span>{summary.total} Gesamt</span>
                  <span>{summary.unchanged} Unverändert</span>
                  <span>{summary.newProducts} Neu</span>
                  <span>{summary.pluChanged} PLU geändert</span>
                  <span>{summary.removed} Entfernt</span>
                  {summary.conflicts > 0 && <span>{summary.conflicts} Konflikte</span>}
                </div>
              </div>
              {hasConflicts && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Es gibt {comparison!.conflicts.length} Konflikt(e) (gleiche PLU, anderer Name). Einspielen derzeit nur ohne Konflikte möglich. Bitte Excel anpassen oder Konflikt-Artikel manuell prüfen.
                </p>
              )}
              {previewDisplayItems.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <PLUTable
                    items={previewDisplayItems}
                    displayMode="MIXED"
                    sortMode="ALPHABETICAL"
                    flowDirection="ROW_BY_ROW"
                    blocks={[]}
                    listType="backshop"
                  />
                </div>
              )}
              <div className="flex justify-between items-center gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isProcessing || hasConflicts}
                >
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird veröffentlicht...</>
                  ) : (
                    <>Ins System einspielen <ArrowRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && publishResult && (
          <Card>
            <CardContent className="space-y-4 text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Backshop-Version veröffentlicht</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatKWLabel(Number(targetKW), Number(targetJahr))}
                </p>
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <span className="font-bold text-lg">{publishResult.itemCount}</span>
                  <div className="text-muted-foreground">Artikel</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Alle Artikel dieser Version haben noch keine Warengruppe. Wenn Sie nach Warengruppen sortieren, ordnen Sie die Artikel bitte unter „Inhalt & Regeln“ → Warengruppen zu.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" className="w-full max-w-xs mx-auto sm:mx-0" onClick={() => navigate('/super-admin/backshop-rules')}>
                  Warengruppen zuordnen
                </Button>
                <Button className="w-full max-w-xs mx-auto sm:mx-0" onClick={handleFinish}>
                  Zur Backshop-Liste
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
