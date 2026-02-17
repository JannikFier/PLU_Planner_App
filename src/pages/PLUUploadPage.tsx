// PLUUploadPage – Vollbild 3-Schritt Excel-Upload (ohne Dialog)

import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState, useCallback } from 'react'
import { usePLUUpload } from '@/hooks/usePLUUpload'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useBlocks } from '@/hooks/useBlocks'
import { useBezeichnungsregeln } from '@/hooks/useBezeichnungsregeln'
import { PLUTable } from '@/components/plu/PLUTable'
import { generateUUID } from '@/lib/utils'
import { resolveConflicts } from '@/lib/comparison-logic'
import { buildDisplayList } from '@/lib/layout-engine'
import { getKWOptionsForUpload, getUploadYearOptions, getCurrentKW } from '@/lib/date-kw-utils'
import type { ConflictItem } from '@/types/plu'
import type { MasterPLUItem } from '@/types/database'

export function PLUUploadPage() {
  const navigate = useNavigate()
  const {
    step,
    setStep,
    pieceResult,
    weightResult,
    pieceComparison,
    weightComparison,
    fileResults,
    setFileAssignment,
    removeFile,
    targetKW,
    setTargetKW,
    targetJahr,
    setTargetJahr,
    conflicts,
    setConflictResolution,
    isProcessing,
    publishResult,
    reset,
    handleFilesSelected,
    startComparison,
    handlePublish,
    totalSummary,
    overwriteConfirmOpen,
    setOverwriteConfirmOpen,
    allNewProducts,
    allRemoved,
  } = usePLUUpload()

  const { data: layoutSettings } = useLayoutSettings()
  const { data: blocks = [] } = useBlocks()
  const { data: regeln = [] } = useBezeichnungsregeln()

  const displayMode = layoutSettings?.display_mode ?? 'MIXED'
  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const flowDirection = layoutSettings?.flow_direction ?? 'COLUMN_FIRST'
  const fontSizes = {
    header: layoutSettings?.font_header_px ?? 24,
    column: layoutSettings?.font_column_px ?? 16,
    product: layoutSettings?.font_product_px ?? 12,
  }

  const previewItems = useMemo((): MasterPLUItem[] => {
    const all: MasterPLUItem[] = []
    if (pieceComparison) all.push(...pieceComparison.allItems)
    if (weightComparison) all.push(...weightComparison.allItems)
    const resolved = conflicts.filter((c) => c.resolution)
    if (resolved.length > 0) {
      const versionId = all[0]?.version_id ?? generateUUID()
      all.push(...resolveConflicts(resolved, versionId))
    }
    return all
  }, [pieceComparison, weightComparison, conflicts])

  const uploadPreviewDisplayItems = useMemo(() => {
    if (step !== 2 || previewItems.length === 0) return []
    const activeRegeln = regeln
      .filter((r) => r.is_active)
      .map((r) => ({
        keyword: r.keyword,
        position: r.position,
        case_sensitive: r.case_sensitive,
      }))
    const versionKw = parseInt(targetKW, 10) || 0
    const versionJahr = parseInt(String(targetJahr), 10) || new Date().getFullYear()
    const result = buildDisplayList({
      masterItems: previewItems,
      customProducts: [],
      hiddenPLUs: new Set<string>(),
      bezeichnungsregeln: activeRegeln,
      blocks,
      sortMode,
      displayMode,
      markRedKwCount: layoutSettings?.mark_red_kw_count ?? 0,
      markYellowKwCount: layoutSettings?.mark_yellow_kw_count ?? 4,
      versionKwNummer: versionKw,
      versionJahr,
      currentKwNummer: getCurrentKW(),
      currentJahr: new Date().getFullYear(),
    })
    return result.items
  }, [step, previewItems, regeln, blocks, layoutSettings, sortMode, displayMode, targetKW, targetJahr])

  const step2ContainerRef = useRef<HTMLDivElement>(null)
  const [step2Boundary, setStep2Boundary] = useState<HTMLDivElement | null>(null)
  const setStep2ContainerRef = useCallback((el: HTMLDivElement | null) => {
    (step2ContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    setStep2Boundary(el)
  }, [])

  const handleFinish = () => {
    reset()
    navigate('/super-admin/masterlist')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-8rem)] w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold tracking-tight">Excel-Upload</h2>
          <Badge variant="outline">Schritt {step}/3</Badge>
        </div>

        {/* Schritt 1: Dateien auswählen */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Dateien hochladen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Wähle eine oder mehrere Excel-Dateien aus. Listentyp (Stück/Gewicht) und KW werden automatisch erkannt und können bei Bedarf angepasst werden. Max. 2 Dateien für den Vergleich.
              </p>
              <div className="space-y-2">
                <Label>Dateien</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files
                    if (files?.length) handleFilesSelected(files)
                    e.target.value = ''
                  }}
                />
              </div>
              {fileResults.length > 0 && (
                <div className="space-y-3">
                  {fileResults.map((entry, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-muted/30"
                    >
                      <Badge variant="secondary" className="shrink-0">
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        {entry.result.totalRows} Zeilen
                        {entry.result.skippedRows > 0 && (
                          <> · {entry.result.skippedRows} beim Einlesen übersprungen</>
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Erkannt: {entry.result.itemType === 'WEIGHT' ? 'Gewicht' : 'Stück'}
                      </span>
                      <Select
                        value={entry.assignment}
                        onValueChange={(v) => setFileAssignment(index, v as 'piece' | 'weight')}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="piece">Stück</SelectItem>
                          <SelectItem value="weight">Gewicht</SelectItem>
                        </SelectContent>
                      </Select>
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
                  ))}
                  {fileResults.some((e) => e.result.skippedRows > 0) && (
                    <p className="text-sm text-muted-foreground">
                      Übersprungene Zeilen haben z. B. ungültige PLU (genau 5 Ziffern), leeren Namen oder doppelte PLU.
                    </p>
                  )}
                </div>
              )}
              <Separator />
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Ziel-KW</Label>
                  <Select
                    value={targetKW ? targetKW : ''}
                    onValueChange={(v) => setTargetKW(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="KW wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {getKWOptionsForUpload().map((kw) => (
                        <SelectItem key={kw} value={String(kw)}>
                          KW {String(kw).padStart(2, '0')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Jahr</Label>
                  <Select
                    value={targetJahr ?? ''}
                    onValueChange={(v) => setTargetJahr(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Jahr wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUploadYearOptions().map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => startComparison()}
                disabled={isProcessing || (!pieceResult && !weightResult) || !targetKW}
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
                      KW {targetKW.padStart(2, '0')} ist für {targetJahr} bereits vorhanden.
                      Möchtest du die bestehende Version überschreiben oder eine andere Ziel-KW wählen?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Ziel-KW ändern</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => startComparison(true)}
                    >
                      Überschreiben
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Schritt 2: Vorschau inkl. Vergleich, ggf. Konflikte, Einspielen */}
        {step === 2 && (
          <div ref={setStep2ContainerRef} className="flex flex-col flex-1 min-h-0">
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="shrink-0">
              <CardTitle>Vergleichsergebnis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden gap-0">
              <div className="w-full rounded-lg border-2 border-border bg-muted/40 p-4 shrink-0 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-lg font-semibold text-muted-foreground">
                  <span>{totalSummary.total} Gesamt</span>
                  <span>{totalSummary.unchanged} Unverändert</span>
                  {totalSummary.newProducts > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="underline decoration-dotted hover:text-plu-new focus:outline-none focus:ring-1 focus:ring-ring rounded">
                          {totalSummary.newProducts} Neu
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(28rem,95vw)] max-h-[min(70vh,480px)] overflow-auto p-4"
                        align="start"
                        collisionBoundary={step2Boundary ?? undefined}
                        collisionPadding={12}
                      >
                        <p className="font-semibold mb-3 text-base">Neue Produkte</p>
                        <ul className="space-y-2 text-sm">
                          {allNewProducts.map((item) => (
                            <li key={item.id} className="flex gap-3">
                              <span className="font-mono shrink-0">{item.plu}</span>
                              <span className="truncate" title={item.system_name}>{item.system_name}</span>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span>0 Neu</span>
                  )}
                  <span>{totalSummary.pluChanged} PLU geändert</span>
                  {totalSummary.removed > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="underline decoration-dotted hover:text-muted-foreground/80 focus:outline-none focus:ring-1 focus:ring-ring rounded">
                          {totalSummary.removed} Entfernt
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(28rem,95vw)] max-h-[min(70vh,480px)] overflow-auto p-4"
                        align="start"
                        collisionBoundary={step2Boundary ?? undefined}
                        collisionPadding={12}
                      >
                        <p className="font-semibold mb-3 text-base">Entfernte Produkte</p>
                        <ul className="space-y-2 text-sm">
                          {allRemoved.map((item) => (
                            <li key={item.id} className="flex gap-3">
                              <span className="font-mono shrink-0">{item.plu}</span>
                              <span className="truncate" title={item.system_name}>{item.system_name}</span>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span>0 Entfernt</span>
                  )}
                  {totalSummary.conflicts > 0 ? <span>{totalSummary.conflicts} Konflikte</span> : null}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4">
                {uploadPreviewDisplayItems.length > 0 && (
                  <div className="rounded-lg border border-border shrink-0">
                    <PLUTable
                      items={uploadPreviewDisplayItems}
                      displayMode={displayMode}
                      sortMode={sortMode}
                      flowDirection={flowDirection}
                      blocks={blocks}
                      fontSizes={fontSizes}
                    />
                  </div>
                )}

                {conflicts.length > 0 && (
                  <div className="space-y-3 shrink-0">
                    <p className="text-sm text-muted-foreground">
                      Bei {conflicts.length} Artikel(n) hat sich der Name geändert, aber die PLU-Nummer ist gleich geblieben.
                      Bitte entscheide für jeden Konflikt:
                    </p>
                    <div className="space-y-3">
                      {conflicts.map((conflict: ConflictItem, index: number) => (
                        <Card key={`${conflict.plu}-${index}`}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{conflict.plu}</Badge>
                              <Badge variant="secondary" className="text-xs">{conflict.itemType}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Excel:</span>
                                <div className="font-medium">{conflict.incomingName}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Bestehend:</span>
                                <div className="font-medium">{conflict.existingName}</div>
                              </div>
                            </div>
                            <Select
                              value={conflict.resolution ?? ''}
                              onValueChange={(val) =>
                                setConflictResolution(index, val as ConflictItem['resolution'])
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Entscheidung wählen..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="replace">Excel-Name übernehmen</SelectItem>
                                <SelectItem value="ignore">Bestehenden Namen behalten</SelectItem>
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-4 shrink-0 pt-4 border-t border-border mt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isProcessing || (conflicts.length > 0 && conflicts.some((c) => !c.resolution))}
                >
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wird veröffentlicht...</>
                  ) : conflicts.length > 0 ? (
                    <>Konflikte speichern & einspielen <ArrowRight className="h-4 w-4 ml-2" /></>
                  ) : (
                    <>Ins System einspielen <ArrowRight className="h-4 w-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Schritt 3: Fertig */}
        {step === 3 && publishResult && (
          <Card>
            <CardContent className="space-y-4 text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Erfolgreich veröffentlicht!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  KW{targetKW.padStart(2, '0')}/{targetJahr}
                </p>
              </div>
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <span className="font-bold text-lg">{publishResult.itemCount}</span>
                  <div className="text-muted-foreground">Artikel</div>
                </div>
                <div>
                  <span className="font-bold text-lg">{publishResult.notificationCount}</span>
                  <div className="text-muted-foreground">Benachrichtigungen</div>
                </div>
              </div>
              <Button className="w-full max-w-xs mx-auto" onClick={handleFinish}>
                Zur Masterliste
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
