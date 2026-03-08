// BackshopUploadPage – 4-Schritt Backshop-Excel-Upload (Upload → Übersicht → Liste → Erfolg)

import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Upload, FileSpreadsheet, CheckCircle2, ArrowLeft, ArrowRight, Loader2, X, Image, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useBackshopUpload } from '@/hooks/useBackshopUpload'
import { useBackshopBlocks, useBackshopBlockRules } from '@/hooks/useBackshopBlocks'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { ImageAssignmentDialog } from '@/components/backshop/ImageAssignmentDialog'
import { PLUTable } from '@/components/plu/PLUTable'
import { suggestBlockIdsForNewItems } from '@/lib/backshop-upload-block-suggest'
import { getKWOptionsForUpload, getUploadYearOptions } from '@/lib/date-kw-utils'
import { formatKWLabel, formatKWShort } from '@/lib/plu-helpers'
import type {
  DisplayItem,
  BackshopCompareItem,
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

/** Produktbild für Übersichtstabellen, Fallback wenn kein Bild. size in px (Standard 48). */
function BackshopThumbnail({ src, size = 48 }: { src: string | null | undefined; size?: number }) {
  const cls = `object-contain rounded border border-border bg-muted`
  if (!src) {
    return (
      <div
        className={cls + ' flex items-center justify-center text-muted-foreground text-xs'}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        title="Kein Bild"
      >
        –
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={cls}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  )
}

/** BackshopCompareItem zu DisplayItem für PLUTable-Vorschau. blockIdForItem liefert block_id pro Item (PLU + Name für Match); blockNameForId liefert Block-Name für block_id (für BY_BLOCK-Sortierung). */
function backshopItemsToDisplayItems(
  items: import('@/types/plu').BackshopCompareItem[],
  blockIdForItem?: (item: import('@/types/plu').BackshopCompareItem) => string | null,
  blockNameForId?: (blockId: string) => string | null,
): DisplayItem[] {
  return items.map((item) => {
    const block_id = blockIdForItem?.(item) ?? null
    const block_name = block_id && blockNameForId ? blockNameForId(block_id) ?? null : null
    return {
      id: item.id,
      plu: item.plu,
      system_name: item.system_name,
      display_name: item.display_name ?? item.system_name,
      item_type: 'PIECE' as const,
      status: item.status as DisplayItem['status'],
      old_plu: item.old_plu,
      warengruppe: null,
      block_id,
      block_name,
      preis: null,
      is_custom: false,
      is_manually_renamed: item.is_manually_renamed ?? false,
      image_url: item.image_url ?? undefined,
    }
  })
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
    unmatchedProducts,
    assignImageToProduct,
  } = useBackshopUpload()

  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageAssignmentCompleted, setImageAssignmentCompleted] = useState(false)
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: blockRules = [] } = useBackshopBlockRules()
  const { data: backshopLayoutSettings } = useBackshopLayoutSettings()
  const backshopSortMode = backshopLayoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const { data: activeBackshopVersion } = useActiveBackshopVersion()
  const { data: currentBackshopItems = [] } = useBackshopPLUData(
    step === 2 || step === 3 ? activeBackshopVersion?.id : undefined,
  )
  const [blockAssignments, setBlockAssignments] = useState<Record<string, string | null>>({})
  const lastSeededComparisonRef = useRef<string>('')

  // Nach Upload: Bei Produkten ohne Bild Dialog automatisch öffnen (async, um set-state-in-effect-Lint zu vermeiden)
  useEffect(() => {
    if (!isAddingFiles && unmatchedProducts.length > 0) {
      queueMicrotask(() => {
        setImageDialogOpen(true)
        setImageAssignmentCompleted(false)
      })
    }
  }, [isAddingFiles, unmatchedProducts.length])

  const handleImageDialogOpenChange = (open: boolean) => {
    setImageDialogOpen(open)
    if (!open) setImageAssignmentCompleted(true)
  }

  const [keepRemoved, setKeepRemoved] = useState<Set<string>>(new Set())
  const [expandNew, setExpandNew] = useState(false)
  const [expandRemoved, setExpandRemoved] = useState(false)

  const newProducts = useMemo(() => {
    if (!comparison?.allItems?.length) return []
    return comparison.allItems.filter((i) => i.status === 'NEW_PRODUCT_YELLOW')
  }, [comparison])

  const suggestedMap = useMemo(() => {
    if (!comparison?.allItems?.length || !blocks.length) return new Map<string, string>()
    return suggestBlockIdsForNewItems(comparison.allItems, blocks, blockRules)
  }, [comparison, blocks, blockRules])

  // Warengruppen-Vorauswahl: bei neuem Vergleich komplett setzen; bei nachgeladenen blocks/rules nur Lücken füllen (User-Korrekturen bleiben). Bei neuem Vergleich auch „Behalten“ zurücksetzen.
  useEffect(() => {
    if ((step !== 2 && step !== 3) || !comparison?.allItems?.length) return
    const sig = `${comparison.summary.total}-${comparison.summary.newProducts}-${comparison.summary.removed}`
    const isNewComparison = lastSeededComparisonRef.current !== sig
    if (isNewComparison) {
      lastSeededComparisonRef.current = sig
      queueMicrotask(() => setKeepRemoved(new Set()))
    }
    if (newProducts.length === 0) return

    setBlockAssignments((prev) => {
      const next = { ...prev }
      let changed = false
      for (const p of newProducts) {
        const suggested = suggestedMap.get(p.plu) ?? null
        if (isNewComparison) {
          next[p.plu] = suggested
          changed = true
        } else if (prev[p.plu] == null && suggested != null) {
          next[p.plu] = suggested
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [step, comparison, newProducts, suggestedMap])

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order_index - b.order_index), [blocks])

  const previewDisplayItems = useMemo(() => {
    if (step !== 3 || !comparison?.allItems?.length) return []
    const currentByPlu = new Map<string, string>()
    const currentByName = new Map<string, string>()
    const norm = (s: string) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
    for (const it of currentBackshopItems) {
      if (it.block_id) {
        currentByPlu.set(it.plu, it.block_id)
        if (it.system_name) currentByName.set(norm(it.system_name), it.block_id)
      }
    }
    const blockIdForItem = (item: BackshopCompareItem) => {
      const fromNew = blockAssignments[item.plu] ?? suggestedMap.get(item.plu) ?? null
      if (fromNew) return fromNew
      const fromCurrent = currentByPlu.get(item.plu) ?? (item.system_name ? currentByName.get(norm(item.system_name)) : null)
      return fromCurrent ?? null
    }
    const blockNameForId = (id: string) => sortedBlocks.find((b) => b.id === id)?.name ?? null
    return backshopItemsToDisplayItems(comparison.allItems, blockIdForItem, blockNameForId)
  }, [step, comparison, blockAssignments, suggestedMap, sortedBlocks, currentBackshopItems])

  const summary = comparison?.summary
  const hasConflicts = (comparison?.conflicts?.length ?? 0) > 0
  // Schritt 2: „Weiter“ erst aktiv, wenn alle neuen Produkte eine Warengruppe (oder „Keine Zuordnung“) haben
  const canProceedStep2 = !hasConflicts && (newProducts.length === 0 || newProducts.every((p) => blockAssignments[p.plu] !== undefined))

  const handlePublishWithBlocks = () => {
    if (!comparison) return
    const toBlockId = (v: string | null | undefined): string | null => {
      if (v == null || v === '' || v === '__none__') return null
      return v
    }
    const itemsWithBlocks: BackshopCompareItem[] = comparison.allItems.map((item) => ({
      ...item,
      block_id: toBlockId(blockAssignments[item.plu] ?? suggestedMap.get(item.plu) ?? null),
    }))
    const keptRemovedItems = comparison.removed.filter((r) => keepRemoved.has(r.plu))
    handlePublish([...itemsWithBlocks, ...keptRemovedItems])
  }

  const toggleKeepRemoved = (plu: string, keep: boolean) => {
    setKeepRemoved((prev) => {
      const next = new Set(prev)
      if (keep) next.add(plu)
      else next.delete(plu)
      return next
    })
  }

  const handleFinish = () => {
    reset()
    navigate('/super-admin/backshop-list')
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-8rem)] w-full max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-bold tracking-tight">Backshop Upload</h2>
          <Badge variant="outline">Schritt {step}/4</Badge>
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
                  {unmatchedProducts.length > 0 && (
                    <div className="rounded-lg border px-4 py-3 text-sm border-amber-200 bg-amber-50 text-amber-800 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">
                            {unmatchedProducts.length} Produkt(e) ohne Bild:
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs">
                            {unmatchedProducts.slice(0, 10).map((p) => (
                              <li key={p.plu}>
                                {p.name} <span className="text-amber-600">({p.plu})</span>
                              </li>
                            ))}
                            {unmatchedProducts.length > 10 && (
                              <li className="text-amber-600">
                                … und {unmatchedProducts.length - 10} weitere
                              </li>
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
                          onClick={() => setImageDialogOpen(true)}
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
                disabled={
                  isProcessing ||
                  fileResults.length === 0 ||
                  !targetKW ||
                  (unmatchedProducts.length > 0 && !imageAssignmentCompleted)
                }
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

        {/* Schritt 2: Nur Leiste (nicht klickbar), neue Produkte + Entfernt immer sichtbar; „Weiter“ erst aktiv wenn alle zugeordnet */}
        {step === 2 && summary && (
          <Card>
            <CardHeader>
              <CardTitle>Vergleich Backshop</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatKWLabel(Number(targetKW), Number(targetJahr))} – ordnen Sie die neuen Produkte einer Warengruppe zu. Danach wird „Weiter“ aktiv.
              </p>
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
              {newProducts.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {newProducts.length} neue Produkte – Warengruppen zuordnen
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ordnen Sie jedes neue Produkt einer Warengruppe zu (oder „Keine Zuordnung“). Danach können Sie auf „Weiter“ klicken.
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium w-[100px]">Bild</th>
                          <th className="px-3 py-2 text-left font-medium">Produkt</th>
                          <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                          <th className="px-3 py-2 text-left font-medium min-w-[180px]">Warengruppe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newProducts.map((item) => (
                          <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                            <td className="px-3 py-2 align-middle">
                              <BackshopThumbnail src={item.image_url} size={96} />
                            </td>
                            <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                            <td className="px-3 py-2">{item.plu}</td>
                            <td className="px-3 py-2">
                              <Select
                                value={blockAssignments[item.plu] ?? '__none__'}
                                onValueChange={(value) =>
                                  setBlockAssignments((prev) => ({ ...prev, [item.plu]: value === '__none__' ? null : value }))
                                }
                              >
                                <SelectTrigger className="h-8 min-w-[160px]">
                                  <SelectValue placeholder="– Keine Zuordnung" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">– Keine Zuordnung</SelectItem>
                                  {sortedBlocks.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {comparison!.removed.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">
                    {comparison!.removed.length} entfernte Produkte – optional behalten
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Diese Produkte sind in der neuen Liste nicht mehr enthalten. Aktivieren Sie „Behalten“, damit sie in der Version bleiben.
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-2 py-2 text-left font-medium w-14">Bild</th>
                          <th className="px-3 py-2 text-left font-medium">Produkt</th>
                          <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Behalten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison!.removed.map((item) => (
                          <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                            <td className="px-2 py-2 align-middle">
                              <BackshopThumbnail src={item.image_url} />
                            </td>
                            <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                            <td className="px-3 py-2">{item.plu}</td>
                            <td className="px-3 py-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={keepRemoved.has(item.plu)}
                                  onChange={(e) => toggleKeepRemoved(item.plu, e.target.checked)}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className="text-xs">Behalten (nicht entfernen)</span>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                  Weiter <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schritt 3: Große Liste aller Produkte (mit Bildern) + ausklappbar Neu/Entfernt + Einspielen */}
        {step === 3 && summary && (
          <Card>
            <CardHeader>
              <CardTitle>Alle Produkte – Einspielen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Vollständige Liste. Neue Produkte sind hervorgehoben. „Neu“ und „Entfernt“ können Sie erneut aufklappen und anpassen.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border-2 border-border bg-muted/40 p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
                  <span>{summary.total} Gesamt</span>
                  <span>{summary.unchanged} Unverändert</span>
                  <button
                    type="button"
                    onClick={() => setExpandNew((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:underline"
                  >
                    {expandNew ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>{summary.newProducts} Neu</span>
                  </button>
                  <span>{summary.pluChanged} PLU geändert</span>
                  <button
                    type="button"
                    onClick={() => setExpandRemoved((v) => !v)}
                    className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:underline"
                  >
                    {expandRemoved ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>{summary.removed} Entfernt</span>
                  </button>
                </div>
              </div>
              {expandNew && newProducts.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">{newProducts.length} neue Produkte – Warengruppen</p>
                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-2 py-2 text-left font-medium w-14">Bild</th>
                          <th className="px-3 py-2 text-left font-medium">Produkt</th>
                          <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                          <th className="px-3 py-2 text-left font-medium min-w-[180px]">Warengruppe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newProducts.map((item) => (
                          <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                            <td className="px-2 py-2 align-middle"><BackshopThumbnail src={item.image_url} /></td>
                            <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                            <td className="px-3 py-2">{item.plu}</td>
                            <td className="px-3 py-2">
                              <Select
                                value={blockAssignments[item.plu] ?? '__none__'}
                                onValueChange={(value) =>
                                  setBlockAssignments((prev) => ({ ...prev, [item.plu]: value === '__none__' ? null : value }))
                                }
                              >
                                <SelectTrigger className="h-8 min-w-[160px]">
                                  <SelectValue placeholder="– Keine Zuordnung" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">– Keine Zuordnung</SelectItem>
                                  {sortedBlocks.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {expandRemoved && comparison!.removed.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">{comparison!.removed.length} entfernte Produkte – optional behalten</p>
                  <div className="overflow-x-auto rounded-md border border-border bg-background">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-2 py-2 text-left font-medium w-14">Bild</th>
                          <th className="px-3 py-2 text-left font-medium">Produkt</th>
                          <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                          <th className="px-3 py-2 text-left font-medium w-32">Behalten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison!.removed.map((item) => (
                          <tr key={item.plu} className="border-b border-border even:bg-muted/30">
                            <td className="px-2 py-2 align-middle"><BackshopThumbnail src={item.image_url} /></td>
                            <td className="px-3 py-2 break-words">{item.display_name ?? item.system_name}</td>
                            <td className="px-3 py-2">{item.plu}</td>
                            <td className="px-3 py-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={keepRemoved.has(item.plu)}
                                  onChange={(e) => toggleKeepRemoved(item.plu, e.target.checked)}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className="text-xs">Behalten (nicht entfernen)</span>
                              </label>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {previewDisplayItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Sortierung: {backshopSortMode === 'BY_BLOCK' ? 'Nach Warengruppen' : 'Alphabetisch'} (wie in der Backshop-Liste)
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <PLUTable
                      items={previewDisplayItems}
                      displayMode="MIXED"
                      sortMode={backshopSortMode}
                      flowDirection="ROW_BY_ROW"
                      blocks={sortedBlocks}
                      listType="backshop"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center gap-4 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
                <Button
                  onClick={handlePublishWithBlocks}
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

        {step === 4 && publishResult && (
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
                Neue Artikel wurden beim Einspielen Warengruppen zugeordnet. Unter „Inhalt & Regeln“ können Sie bei Bedarf nachjustieren.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" className="w-full max-w-xs mx-auto sm:mx-0" onClick={() => navigate('/super-admin/backshop-rules')}>
                  Inhalt & Regeln (Warengruppen)
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
