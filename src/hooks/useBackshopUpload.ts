// useBackshopUpload: Backshop-Excel-Upload, Vergleich, Einspielen

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatError } from '@/lib/error-messages'
import {
  parseBackshopExcelFile,
  parseBackshopExcelFileWithColumns,
  previewBackshopExcelFile,
  type BackshopExcelPreview,
  type BackshopManualMapping,
} from '@/lib/backshop-excel-parser'
import { uploadBackshopImagesAndAssignUrls, uploadManualImage } from '@/lib/backshop-excel-images'
import type { UnmatchedProduct } from '@/lib/backshop-excel-images'
import { compareBackshopWithCurrentVersion } from '@/lib/comparison-logic'
import { publishBackshopVersion } from '@/lib/publish-backshop-version'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { supabase } from '@/lib/supabase'
import type { BackshopParseResult, ParsedBackshopRow } from '@/types/plu'
import type { BackshopCompareItem } from '@/types/plu'
import type { BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopMasterPLUItem } from '@/types/database'
import { getKWAndYearFromDate, parseKWAndYearFromFilename } from '@/lib/date-kw-utils'

/** 1 Upload · 2 Vergleich · 3 Warengruppen · 4 Vorschau · 5 Erfolg */
export type BackshopUploadStep = 1 | 2 | 3 | 4 | 5

/** Toasts für Bild-Diagnose: unterscheidet Duplikat-PLU-Spalten von anderen Ursachen. */
function toastBackshopImageDiagnostics(
  fileName: string,
  rowsWithoutUrl: number,
  imagesUnassigned: number,
  extractedCount: number,
  failedUploads: number,
  imagesFromDuplicatePlu?: number,
): void {
  if (failedUploads > 0) {
    toast.error(
      `${failedUploads} Bild(er) aus "${fileName}" konnten nach 3 Versuchen nicht hochgeladen werden (Supabase Storage). Die restlichen Bilder wurden übernommen – bitte später erneut hochladen.`,
    )
  }
  if (extractedCount === 0 && rowsWithoutUrl > 0) {
    toast.warning(
      `Aus "${fileName}" konnten keine Bilder gelesen werden. Bei manchen Excel-Dateien (z.B. aus Microsoft Excel) werden eingebettete Bilder derzeit nicht erkannt. PLU und Name wurden übernommen.`,
    )
  } else if (rowsWithoutUrl > 0 || imagesUnassigned > 0) {
    const parts: string[] = []
    if (rowsWithoutUrl > 0) parts.push(`${rowsWithoutUrl} Zeile(n) ohne Bild`)
    if (imagesUnassigned > 0) {
      const dup = imagesFromDuplicatePlu ?? 0
      if (dup > 0 && dup === imagesUnassigned) {
        parts.push(
          imagesUnassigned > 10
            ? `${imagesUnassigned} Bild(er) in Spalten mit doppelter PLU (nur die erste Spalte pro PLU wird importiert; weitere Vorkommen in der Excel bleiben ohne eigenes Produkt)`
            : `${imagesUnassigned} Bild(er) in Spalten mit doppelter PLU (nur die erste Spalte pro PLU wird importiert; weitere Vorkommen in der Excel bleiben ohne eigenes Produkt)`,
        )
      } else if (dup > 0 && dup < imagesUnassigned) {
        parts.push(`${dup} Bild(er) wegen doppelter PLU (nur erste Spalte importiert)`)
        const rest = imagesUnassigned - dup
        parts.push(
          rest > 10
            ? `${rest} weitere Bild(er) keiner Zeile zugeordnet`
            : `${rest} Bild(er) keiner Zeile zugeordnet (andere Ursache)`,
        )
      } else {
        parts.push(
          imagesUnassigned > 10
            ? `${imagesUnassigned} weitere Bild(er) in der Datei (es wird 1 Bild pro Produkt verwendet)`
            : `${imagesUnassigned} Bild(er) keiner Zeile zugeordnet`,
        )
      }
    }
    toast.info(parts.join('; ') + '. Details in der Browser-Konsole (Entwicklermodus).')
  }
}

function masterToCompareItem(row: BackshopMasterPLUItem): BackshopCompareItem {
  return {
    id: row.id,
    plu: row.plu,
    system_name: row.system_name,
    display_name: row.display_name,
    is_manually_renamed: row.is_manually_renamed,
    status: row.status,
    old_plu: row.old_plu,
    image_url: row.image_url,
    is_manual_supplement: row.is_manual_supplement ?? false,
  }
}

export interface UseBackshopUploadOptions {
  /** Quelle der hochgeladenen Artikel: edeka | harry | aryzta. Default: 'edeka'. */
  source?: BackshopExcelSource
}

export function useBackshopUpload(options: UseBackshopUploadOptions = {}) {
  const source: BackshopExcelSource = options.source ?? 'edeka'
  const { user } = useAuth()
  const { currentStoreId } = useCurrentStore()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<BackshopUploadStep>(1)
  const [fileResults, setFileResults] = useState<BackshopParseResult[]>([])
  const [targetKW, setTargetKW] = useState('')
  const [targetJahr, setTargetJahr] = useState(String(new Date().getFullYear()))
  const [comparison, setComparison] = useState<import('@/types/plu').BackshopComparisonResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAddingFiles, setIsAddingFiles] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<{ uploaded: number; total: number } | null>(null)
  const [publishResult, setPublishResult] = useState<{ itemCount: number } | null>(null)
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false)
  const [replaceExistingVersion, setReplaceExistingVersion] = useState(false)
  const [unmatchedProducts, setUnmatchedProducts] = useState<UnmatchedProduct[]>([])
  const [lastUploadId, setLastUploadId] = useState('')
  const [lastXlsxIndex, setLastXlsxIndex] = useState(0)
  const [columnPreview, setColumnPreview] = useState<{
    fileIndex: number
    preview: BackshopExcelPreview
    /** Originaldatei für Bild-Miniaturen im Layout-Dialog (.xlsx). */
    file: File
    /** Letztes Auto-Parse-Ergebnis zur Anzeige im Dialog (welches Layout erkannt wurde). */
    parseResult?: BackshopParseResult
  } | null>(null)
  // Originaldateien vorhalten, damit Re-Parse mit manuellem Mapping möglich ist.
  const originalFilesRef = useRef<File[]>([])

  const reset = useCallback(() => {
    setStep(1)
    setFileResults([])
    setTargetKW('')
    setTargetJahr(String(new Date().getFullYear()))
    setComparison(null)
    setIsProcessing(false)
    setIsAddingFiles(false)
    setImageUploadProgress(null)
    setPublishResult(null)
    setOverwriteConfirmOpen(false)
    setReplaceExistingVersion(false)
    setUnmatchedProducts([])
    setLastUploadId('')
    setLastXlsxIndex(0)
    setColumnPreview(null)
    originalFilesRef.current = []
  }, [])

  // Beim Start: Ziel-KW auf aktuelle Kalenderwoche und aktuelles Jahr setzen, wenn noch leer
  useEffect(() => {
    if (targetKW !== '') return
    const { kw, year } = getKWAndYearFromDate(new Date())
    setTargetKW(String(kw))
    setTargetJahr(String(year))
  }, [targetKW])

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    const all = Array.from(files)
    const list = all.filter(
      (f) => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls')
    )
    if (list.length === 0) {
      toast.error('Bitte nur Excel-Dateien (.xlsx oder .xls) auswählen.')
      return
    }
    setIsAddingFiles(true)
    setUnmatchedProducts([])
    const results: BackshopParseResult[] = []
    /** Parallel zu `results`: welches Original-File zu welchem Parse-Ergebnis gehört (für Auto-Fallback). */
    const resultFiles: File[] = []
    const uploadId = crypto.randomUUID()
    setLastUploadId(uploadId)
    let xlsxIndex = 0
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const isXlsx = file.name.toLowerCase().endsWith('.xlsx')
      try {
        const result = await parseBackshopExcelFile(file)
        if (isXlsx && result.rows.some((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)) {
          try {
            const urlMap = await uploadBackshopImagesAndAssignUrls(result.rows, file, {
              versionIdOrUploadId: uploadId,
              fileIndex: xlsxIndex,
              duplicatePluDetails: result.skippedDetails?.duplicatePlu,
              onProgress: (uploaded, total) => setImageUploadProgress(total > 0 ? { uploaded, total } : null),
              onUnmatchedProducts: (products) => {
                if (products.length > 0) setUnmatchedProducts((prev) => [...prev, ...products])
              },
              onDiagnostic: (rowsWithoutUrl, imagesUnassigned, extractedCount, failedUploads = 0, dupOrphans) => {
                toastBackshopImageDiagnostics(
                  file.name,
                  rowsWithoutUrl,
                  imagesUnassigned,
                  extractedCount,
                  failedUploads,
                  dupOrphans,
                )
              },
            })
            setImageUploadProgress(null)
            setLastXlsxIndex(xlsxIndex)
            xlsxIndex += 1
            for (const row of result.rows) {
              const url = urlMap.get(row.plu)
              if (url) row.imageUrl = url
            }
          } catch (imgErr) {
            console.warn('Bild-Extraktion/Upload fehlgeschlagen:', imgErr)
            toast.error(
              `Bilder aus "${file.name}" konnten nicht übernommen werden. Liste enthält weiterhin PLU und Name.`
            )
          }
        }
        results.push(result)
        resultFiles.push(file)
      } catch (err) {
        toast.error(
          `"${file.name}" konnte nicht gelesen werden: ${formatError(err)}`
        )
      }
    }
    if (results.length > 0) {
      const startIndex = originalFilesRef.current.length
      setFileResults((prev) => [...prev, ...results])
      // Nur erfolgreich geparste Files tracken, damit Indizes zu `fileResults` passen (z. B. für Auto-Fallback/removeFile).
      originalFilesRef.current = [...originalFilesRef.current, ...resultFiles]
      for (const result of results) {
        const parsed = parseKWAndYearFromFilename(result.fileName)
        if (parsed) {
          setTargetKW((prev) => {
            if (prev !== '') return prev
            setTargetJahr(String(parsed.year))
            return String(parsed.kw)
          })
          break
        }
      }
      // Auto-Fallback: Bei schlechter Auto-Erkennung den Spalten-Dialog öffnen.
      // Schwelle: >30 % der Eingabezeilen übersprungen ODER weniger als 3 Produkte erkannt.
      for (let i = 0; i < results.length; i++) {
        const res = results[i]
        const file = resultFiles[i]
        if (!file) continue
        const inputRowsEstimate = Math.max(res.totalRows + (res.skippedRows ?? 0), 1)
        const skipRatio = (res.skippedRows ?? 0) / inputRowsEstimate
        if (skipRatio > 0.3 || res.totalRows < 3) {
          try {
            const preview = await previewBackshopExcelFile(file)
            setColumnPreview({ fileIndex: startIndex + i, preview, file, parseResult: res })
            toast.info(
              `„${file.name}“: Auto-Erkennung lieferte nur ${res.totalRows} Produkte (${res.skippedRows ?? 0} übersprungen). Bitte Layout im Dialog prüfen.`,
            )
            break
          } catch (err) {
            console.warn('Auto-Fallback-Vorschau fehlgeschlagen:', err)
          }
        }
      }
    }
    setIsAddingFiles(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFileResults((prev) => prev.filter((_, i) => i !== index))
    originalFilesRef.current = originalFilesRef.current.filter((_, i) => i !== index)
  }, [])

  /** Öffnet den manuellen Spalten-Mapping-Dialog für die Originaldatei zu `fileIndex`. */
  const openColumnMapping = useCallback(
    async (fileIndex: number) => {
      const file = originalFilesRef.current[fileIndex]
      if (!file) {
        toast.error('Originaldatei nicht mehr vorhanden. Bitte Datei erneut auswählen.')
        return
      }
      try {
        const preview = await previewBackshopExcelFile(file)
        const parseResult = fileResults[fileIndex]
        setColumnPreview({ fileIndex, preview, file, parseResult })
      } catch (err) {
        toast.error(`Vorschau konnte nicht geladen werden: ${formatError(err)}`)
      }
    },
    [fileResults],
  )

  const closeColumnMapping = useCallback(() => {
    setColumnPreview(null)
  }, [])

  /** Reparst die Datei mit manuellem Spalten-Mapping und ersetzt den Eintrag in fileResults. */
  const applyColumnMapping = useCallback(
    async (mapping: BackshopManualMapping) => {
      if (!columnPreview) return
      const fileIndex = columnPreview.fileIndex
      const file = originalFilesRef.current[fileIndex]
      if (!file) {
        toast.error('Originaldatei nicht mehr vorhanden.')
        return
      }
      try {
        const result = await parseBackshopExcelFileWithColumns(file, mapping)
        const isXlsx = file.name.toLowerCase().endsWith('.xlsx')
        const hasImageReference =
          (mapping.layoutMode === 'block' && (mapping.imageRowIndex ?? -1) >= 0) ||
          ((mapping.layoutMode ?? 'classic') === 'classic' && mapping.imageCol >= 0)
        if (isXlsx && hasImageReference && result.rows.some((r) => r.imageSheetRow0 != null && r.imageSheetCol0 != null)) {
          try {
            const urlMap = await uploadBackshopImagesAndAssignUrls(result.rows, file, {
              versionIdOrUploadId: lastUploadId || crypto.randomUUID(),
              fileIndex: lastXlsxIndex,
              duplicatePluDetails: result.skippedDetails?.duplicatePlu,
              onProgress: (uploaded, total) => setImageUploadProgress(total > 0 ? { uploaded, total } : null),
              onUnmatchedProducts: (products) => {
                if (products.length > 0) setUnmatchedProducts((prev) => [...prev, ...products])
              },
              onDiagnostic: (rowsWithoutUrl, imagesUnassigned, extractedCount, failedUploads = 0, dupOrphans) => {
                toastBackshopImageDiagnostics(
                  file.name,
                  rowsWithoutUrl,
                  imagesUnassigned,
                  extractedCount,
                  failedUploads,
                  dupOrphans,
                )
              },
            })
            setImageUploadProgress(null)
            for (const row of result.rows) {
              const url = urlMap.get(row.plu)
              if (url) row.imageUrl = url
            }
          } catch (imgErr) {
            console.warn('Bild-Extraktion/Upload fehlgeschlagen (manuelles Mapping):', imgErr)
          }
        }
        setFileResults((prev) => prev.map((r, i) => (i === fileIndex ? result : r)))
        toast.success(`Layout übernommen: ${result.totalRows} Produkte erkannt.`)
      } catch (err) {
        toast.error(`Re-Parse fehlgeschlagen: ${formatError(err)}`)
      } finally {
        setColumnPreview(null)
      }
    },
    [columnPreview, lastUploadId, lastXlsxIndex]
  )

  const startComparison = useCallback(async (forceOverwrite = false): Promise<boolean> => {
    const mergedRows = mergeAndDedupeRows(fileResults)
    if (mergedRows.length === 0) {
      toast.error('Keine gültigen Backshop-Zeilen in den Dateien')
      return false
    }
    const kw = parseInt(targetKW, 10)
    const jahr = parseInt(targetJahr, 10)
    if (Number.isNaN(kw) || Number.isNaN(jahr)) {
      toast.error('Bitte gültige Ziel-KW und Jahr eingeben')
      return false
    }
    // Nur warnen, wenn für diese Ziel-KW bereits Items dieser Quelle existieren (nicht nur „KW existiert“).
    const { data: targetVersionRow } = await supabase
      .from('backshop_versions')
      .select('id')
      .eq('kw_nummer', kw)
      .eq('jahr', jahr)
      .maybeSingle()
    const targetVersionId = (targetVersionRow as { id: string } | null)?.id ?? null
    let targetHasOwnSource = false
    if (targetVersionId && !forceOverwrite) {
      const { count, error: countErr } = await supabase
        .from('backshop_master_plu_items')
        .select('id', { count: 'exact', head: true })
        .eq('version_id', targetVersionId)
        .eq('source', source)
      if (countErr) {
        toast.error(`Prüfung fehlgeschlagen: ${formatError(countErr)}`)
        return false
      }
      targetHasOwnSource = (count ?? 0) > 0
    }
    if (!forceOverwrite && targetHasOwnSource) {
      setOverwriteConfirmOpen(true)
      return false
    }
    setOverwriteConfirmOpen(false)
    if (forceOverwrite) setReplaceExistingVersion(true)
    setIsProcessing(true)
    try {
      const { data: activeRow } = await supabase
        .from('backshop_versions')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      const activeId = (activeRow as { id: string } | null)?.id ?? null

      let currentItems: BackshopCompareItem[] = []
      if (activeId) {
        const { data } = await supabase
          .from('backshop_master_plu_items')
          .select('*')
          .eq('version_id', activeId)
          .eq('source', source)
        currentItems = ((data ?? []) as BackshopMasterPLUItem[]).map(masterToCompareItem)
      }

      let previousItems: BackshopCompareItem[] = []
      const { data: frozenVersions } = await supabase
        .from('backshop_versions')
        .select('id')
        .eq('status', 'frozen')
      const frozenIds = ((frozenVersions ?? []) as { id: string }[]).map((v) => v.id)
      if (frozenIds.length > 0) {
        const { data } = await supabase
          .from('backshop_master_plu_items')
          .select('*')
          .in('version_id', frozenIds)
          .eq('source', source)
        previousItems = ((data ?? []) as BackshopMasterPLUItem[]).map(masterToCompareItem)
      }

      // Erster Upload dieser Quelle (keine Zeilen dieser Marke in der aktiven Version).
      const isFirstUpload = currentItems.length === 0
      const result = compareBackshopWithCurrentVersion({
        incomingRows: mergedRows,
        currentItems,
        previousItems,
        newVersionId: '',
        isFirstUpload,
      })
      setComparison(result)
      setStep(2)
      return true
    } catch (err) {
      toast.error(`Vergleich fehlgeschlagen: ${formatError(err)}`)
      return false
    } finally {
      setIsProcessing(false)
    }
  }, [fileResults, targetKW, targetJahr, source])

  const handlePublish = useCallback(async (itemsWithBlockIds?: BackshopCompareItem[]): Promise<boolean> => {
    if (!user || !comparison) return false
    const kw = parseInt(targetKW, 10)
    const jahr = parseInt(targetJahr, 10)
    if (Number.isNaN(kw) || Number.isNaN(jahr)) {
      toast.error('Ungültige KW oder Jahr')
      return false
    }
    const itemsToPublish = itemsWithBlockIds ?? comparison.allItems
    setIsProcessing(true)
    try {
      if (!currentStoreId) throw new Error('Kein Markt ausgewählt.')
      // Multi-Source: Wenn die Ziel-KW schon existiert (mit ANDERER Quelle), muss die Version neu geschrieben werden.
      // Die anderen Quellen werden im Publish automatisch aus Ziel-KW + Active gemerged und wieder eingefügt.
      // Daher ist Replace immer sicher: entweder Version existiert nicht (no-op) oder wird 1:1 neu gebaut.
      const result = await publishBackshopVersion({
        kwNummer: kw,
        jahr,
        items: itemsToPublish,
        createdBy: user.id,
        storeId: currentStoreId,
        replaceExistingVersion: true,
        source,
      })
      setPublishResult({ itemCount: result.itemCount })
      setReplaceExistingVersion(false)
      await queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      await queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
      await queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      setStep(5)
      toast.success('Backshop-Version erfolgreich veröffentlicht!')
      return true
    } catch (err) {
      toast.error(`Veröffentlichung fehlgeschlagen: ${formatError(err)}`)
      return false
    } finally {
      setIsProcessing(false)
    }
  }, [user, targetKW, targetJahr, comparison, replaceExistingVersion, queryClient, currentStoreId, source])

  const assignImageToProduct = useCallback(async (plu: string, dataUrl: string) => {
    const url = await uploadManualImage(dataUrl, plu, lastUploadId, lastXlsxIndex)
    if (!url) {
      toast.error(`Bild für PLU ${plu} konnte nicht hochgeladen werden.`)
      return
    }
    setFileResults((prev) =>
      prev.map((result) => ({
        ...result,
        rows: result.rows.map((r) => (r.plu === plu ? { ...r, imageUrl: url } : r)),
      }))
    )
    setUnmatchedProducts((prev) => prev.filter((p) => p.plu !== plu))
    toast.success(`Bild für ${plu} zugeordnet.`)
  }, [lastUploadId, lastXlsxIndex])

  const setOverwriteConfirmOpenState = useCallback((open: boolean) => {
    setOverwriteConfirmOpen(open)
  }, [])

  return {
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
    setOverwriteConfirmOpen: setOverwriteConfirmOpenState,
    unmatchedProducts,
    assignImageToProduct,
    source,
    columnPreview,
    openColumnMapping,
    closeColumnMapping,
    applyColumnMapping,
  }
}

/** Mehrere Backshop-Parse-Ergebnisse zu einer Liste zusammenführen. Pro PLU gewinnt die erste vorkommende Zeile (aus der ersten Datei); spätere Dateien überschreiben bestehende PLUs nicht. */
function mergeAndDedupeRows(results: BackshopParseResult[]): ParsedBackshopRow[] {
  const byPlu = new Map<string, ParsedBackshopRow>()
  for (const res of results) {
    for (const row of res.rows) {
      if (!byPlu.has(row.plu)) {
        byPlu.set(row.plu, row)
      }
    }
  }
  return Array.from(byPlu.values())
}
