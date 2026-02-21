// useBackshopUpload: Backshop-Excel-Upload, Vergleich, Einspielen

import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseBackshopExcelFile } from '@/lib/backshop-excel-parser'
import { uploadBackshopImagesAndAssignUrls } from '@/lib/backshop-excel-images'
import { compareBackshopWithCurrentVersion } from '@/lib/comparison-logic'
import { publishBackshopVersion } from '@/lib/publish-backshop-version'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { BackshopParseResult, ParsedBackshopRow } from '@/types/plu'
import type { BackshopCompareItem } from '@/types/plu'
import type { BackshopMasterPLUItem } from '@/types/database'
import {
  versionExistsForKW,
  getKWAndYearFromDate,
  parseKWAndYearFromFilename,
} from '@/lib/date-kw-utils'

export type BackshopUploadStep = 1 | 2 | 3

function masterToCompareItem(row: BackshopMasterPLUItem): BackshopCompareItem {
  return {
    id: row.id,
    plu: row.plu,
    system_name: row.system_name,
    display_name: row.display_name,
    status: row.status,
    old_plu: row.old_plu,
    image_url: row.image_url,
  }
}

export function useBackshopUpload() {
  const { user } = useAuth()
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
    const results: BackshopParseResult[] = []
    const uploadId = crypto.randomUUID()
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
              onProgress: (uploaded, total) => setImageUploadProgress(total > 0 ? { uploaded, total } : null),
              onDiagnostic: (rowsWithoutUrl, imagesUnassigned, extractedCount) => {
                if (extractedCount === 0 && rowsWithoutUrl > 0) {
                  toast.warning(
                    `Aus "${file.name}" konnten keine Bilder gelesen werden. Bei manchen Excel-Dateien (z. B. aus Microsoft Excel) werden eingebettete Bilder derzeit nicht erkannt. PLU und Name wurden übernommen.`
                  )
                } else if (rowsWithoutUrl > 0 || imagesUnassigned > 0) {
                  const parts: string[] = []
                  if (rowsWithoutUrl > 0) parts.push(`${rowsWithoutUrl} Zeile(n) ohne Bild`)
                  if (imagesUnassigned > 0) {
                    parts.push(
                      imagesUnassigned > 10
                        ? `${imagesUnassigned} weitere Bild(er) in der Datei (es wird 1 Bild pro Produkt verwendet)`
                        : `${imagesUnassigned} Bild(er) keiner Zeile zugeordnet`
                    )
                  }
                  toast.info(parts.join('; ') + '. Details in der Browser-Konsole (Entwicklermodus).')
                }
              },
            })
            setImageUploadProgress(null)
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
      } catch (err) {
        toast.error(
          `"${file.name}" konnte nicht gelesen werden: ${err instanceof Error ? err.message : 'Unbekannt'}`
        )
      }
    }
    if (results.length > 0) {
      setFileResults((prev) => [...prev, ...results])
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
    }
    setIsAddingFiles(false)
  }, [])

  const removeFile = useCallback((index: number) => {
    setFileResults((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const startComparison = useCallback(async (forceOverwrite = false) => {
    const mergedRows = mergeAndDedupeRows(fileResults)
    if (mergedRows.length === 0) {
      toast.error('Keine gültigen Backshop-Zeilen in den Dateien')
      return
    }
    const kw = parseInt(targetKW, 10)
    const jahr = parseInt(targetJahr, 10)
    if (Number.isNaN(kw) || Number.isNaN(jahr)) {
      toast.error('Bitte gültige Ziel-KW und Jahr eingeben')
      return
    }
    const { data: versions } = await supabase.from('backshop_versions').select('id, kw_nummer, jahr')
    const versionsList = (versions ?? []) as { id: string; kw_nummer: number; jahr: number }[]
    if (!forceOverwrite && versionExistsForKW(kw, jahr, versionsList)) {
      setOverwriteConfirmOpen(true)
      return
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
        previousItems = ((data ?? []) as BackshopMasterPLUItem[]).map(masterToCompareItem)
      }

      const isFirstUpload = !activeId
      const result = compareBackshopWithCurrentVersion({
        incomingRows: mergedRows,
        currentItems,
        previousItems,
        newVersionId: '',
        isFirstUpload,
      })
      setComparison(result)
      setStep(2)
    } catch (err) {
      toast.error(`Vergleich fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [fileResults, targetKW, targetJahr])

  const handlePublish = useCallback(async () => {
    if (!user || !comparison) return
    const kw = parseInt(targetKW, 10)
    const jahr = parseInt(targetJahr, 10)
    if (Number.isNaN(kw) || Number.isNaN(jahr)) {
      toast.error('Ungültige KW oder Jahr')
      return
    }
    setIsProcessing(true)
    try {
      const result = await publishBackshopVersion({
        kwNummer: kw,
        jahr,
        items: comparison.allItems,
        createdBy: user.id,
        replaceExistingVersion,
      })
      setPublishResult({ itemCount: result.itemCount })
      setReplaceExistingVersion(false)
      await queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      await queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
      await queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      setStep(3)
      toast.success('Backshop-Version erfolgreich veröffentlicht!')
    } catch (err) {
      toast.error(`Veröffentlichung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [user, targetKW, targetJahr, comparison, replaceExistingVersion, queryClient])

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
  }
}

/** Mehrere Backshop-Parse-Ergebnisse zu einer Liste von Zeilen zusammenführen; PLU-Duplikate: Zeile mit Bild (imageUrl) hat Vorrang, sonst erste. */
function mergeAndDedupeRows(results: BackshopParseResult[]): ParsedBackshopRow[] {
  const byPlu = new Map<string, ParsedBackshopRow>()
  for (const res of results) {
    for (const row of res.rows) {
      const existing = byPlu.get(row.plu)
      if (!existing) {
        byPlu.set(row.plu, row)
      } else if (row.imageUrl && !existing.imageUrl) {
        byPlu.set(row.plu, row)
      }
    }
  }
  return Array.from(byPlu.values())
}
