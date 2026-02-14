// usePLUUpload: Gemeinsame Logik für Excel-Upload und KW-Vergleich (3 Schritte)

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseExcelFile } from '@/lib/excel-parser'
import { clampKWToUploadRange, getCurrentKW, getNextFreeKW, versionExistsForKW } from '@/lib/date-kw-utils'
import { compareWithCurrentVersion, resolveConflicts } from '@/lib/comparison-logic'
import { publishVersion } from '@/lib/publish-version'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useVersions } from '@/hooks/useVersions'
import type { ExcelParseResult, ComparisonResult, ConflictItem } from '@/types/plu'
import type { MasterPLUItem } from '@/types/database'

export type UploadStep = 1 | 2 | 3
export type FileAssignment = 'piece' | 'weight'

/** Max. Anzahl Dateien für den Vergleich (je eine Stück- und eine Gewichtsliste) */
const MAX_UPLOAD_FILES = 2

export type FileResultEntry = { result: ExcelParseResult; assignment: FileAssignment }

export function usePLUUpload() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: versionsData } = useVersions()
  const versions = versionsData ?? []
  const hasSetInitialKwRef = useRef(false)

  const [step, setStep] = useState<UploadStep>(1)
  const [fileResults, setFileResults] = useState<FileResultEntry[]>([])
  const [targetKW, setTargetKW] = useState<string>('')
  const [targetJahr, setTargetJahr] = useState<string>(String(new Date().getFullYear()))
  const [pieceComparison, setPieceComparison] = useState<ComparisonResult | null>(null)
  const [weightComparison, setWeightComparison] = useState<ComparisonResult | null>(null)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ itemCount: number; notificationCount: number } | null>(null)
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false)

  // Abgeleitet: die Datei mit Zuordnung „Stück“ bzw. „Gewicht“ (für Vergleich)
  const pieceResult = fileResults.find((f) => f.assignment === 'piece')?.result ?? null
  const weightResult = fileResults.find((f) => f.assignment === 'weight')?.result ?? null

  // Einmalige Vorauswahl: nächste freie KW für aktuelles Jahr
  useEffect(() => {
    if (versions.length === 0 || hasSetInitialKwRef.current || targetKW !== '') return
    const jahr = parseInt(targetJahr, 10)
    if (Number.isNaN(jahr)) return
    const currentKW = getCurrentKW()
    const nextFree = getNextFreeKW(currentKW, jahr, versions)
    setTargetKW(String(clampKWToUploadRange(nextFree)))
    hasSetInitialKwRef.current = true
  }, [versions, targetJahr, targetKW])

  const reset = useCallback(() => {
    hasSetInitialKwRef.current = false
    setOverwriteConfirmOpen(false)
    setStep(1)
    setFileResults([])
    setTargetKW('')
    setTargetJahr(String(new Date().getFullYear()))
    setPieceComparison(null)
    setWeightComparison(null)
    setConflicts([])
    setIsProcessing(false)
    setPublishResult(null)
  }, [])

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, MAX_UPLOAD_FILES)
    if (list.length === 0) return
    try {
      const entries: FileResultEntry[] = []
      for (const file of list) {
        const result = await parseExcelFile(file)
        const assignment: FileAssignment = result.itemType === 'WEIGHT' ? 'weight' : 'piece'
        entries.push({ result, assignment })
      }
      // Bei genau 2 Dateien: sicherstellen, dass eine Stück und eine Gewicht
      if (entries.length === 2 && entries[0].assignment === entries[1].assignment) {
        entries[1] = { ...entries[1], assignment: entries[0].assignment === 'piece' ? 'weight' : 'piece' }
      }
      setFileResults(entries)
      const firstWithKw = entries.find((e) => e.result.kwNummer != null)
      if (firstWithKw?.result.kwNummer) {
        setTargetKW((prev) => (prev ? prev : String(firstWithKw!.result.kwNummer!)))
      }
    } catch (err) {
      toast.error(`Fehler beim Lesen: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }, [])

  const setFileAssignment = useCallback((index: number, assignment: FileAssignment) => {
    setFileResults((prev) => {
      const next = [...prev]
      if (index < 0 || index >= next.length) return prev
      next[index] = { ...next[index], assignment }
      return next
    })
  }, [])

  const removeFile = useCallback((index: number) => {
    setFileResults((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const startComparison = useCallback(async (forceOverwrite = false) => {
    if (!pieceResult && !weightResult) {
      toast.error('Bitte mindestens eine Excel-Datei auswählen')
      return
    }
    if (!targetKW) {
      toast.error('Bitte Ziel-KW eingeben')
      return
    }
    const kw = parseInt(targetKW, 10)
    const jahr = parseInt(targetJahr, 10)
    if (!forceOverwrite && versionExistsForKW(kw, jahr, versions)) {
      setOverwriteConfirmOpen(true)
      return
    }
    setOverwriteConfirmOpen(false)
    setIsProcessing(true)
    try {
      const newVersionId = crypto.randomUUID()
      const { data: activeVersionData } = await supabase
        .from('versions')
        .select('*')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      const activeVersionRow = activeVersionData as { id: string } | null

      let currentItems: MasterPLUItem[] = []
      if (activeVersionRow) {
        const { data } = await supabase
          .from('master_plu_items')
          .select('*')
          .eq('version_id', activeVersionRow.id)
        currentItems = (data ?? []) as MasterPLUItem[]
      }

      let previousItems: MasterPLUItem[] = []
      if (activeVersionRow) {
        const { data: frozenVersions } = await supabase
          .from('versions')
          .select('*')
          .eq('status', 'frozen')
        const frozenRows = (frozenVersions ?? []) as { id: string }[]
        if (frozenRows.length > 0) {
          const frozenIds = frozenRows.map((v) => v.id)
          const { data } = await supabase
            .from('master_plu_items')
            .select('*')
            .in('version_id', frozenIds)
          previousItems = (data ?? []) as MasterPLUItem[]
        }
      }

      const isFirstUpload = !activeVersionRow
      const allConflicts: ConflictItem[] = []

      if (pieceResult && pieceResult.rows.length > 0) {
        const result = compareWithCurrentVersion({
          incomingRows: pieceResult.rows,
          itemType: 'PIECE',
          currentItems,
          previousItems,
          newVersionId,
          isFirstUpload,
        })
        setPieceComparison(result)
        allConflicts.push(...result.conflicts)
      }
      if (weightResult && weightResult.rows.length > 0) {
        const result = compareWithCurrentVersion({
          incomingRows: weightResult.rows,
          itemType: 'WEIGHT',
          currentItems,
          previousItems,
          newVersionId,
          isFirstUpload,
        })
        setWeightComparison(result)
        allConflicts.push(...result.conflicts)
      }
      setConflicts(allConflicts)
      setStep(2)
    } catch (err) {
      toast.error(`Vergleich fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [pieceResult, weightResult, targetKW, targetJahr, versions])

  const handlePublish = useCallback(async () => {
    if (!user) return
    setIsProcessing(true)
    try {
      const kw = parseInt(targetKW, 10)
      const jahr = parseInt(targetJahr, 10)
      const allItems: MasterPLUItem[] = []
      if (pieceComparison) allItems.push(...pieceComparison.allItems)
      if (weightComparison) allItems.push(...weightComparison.allItems)
      const resolvedConflicts = conflicts.filter((c) => c.resolution)
      if (resolvedConflicts.length > 0) {
        const newVersionId = allItems[0]?.version_id ?? crypto.randomUUID()
        const resolvedItems = resolveConflicts(resolvedConflicts, newVersionId)
        allItems.push(...resolvedItems)
      }
      const result = await publishVersion({
        kwNummer: kw,
        jahr,
        items: allItems,
        createdBy: user.id,
      })
      setPublishResult({
        itemCount: result.itemCount,
        notificationCount: result.notificationCount,
      })
      await queryClient.invalidateQueries({ queryKey: ['versions'] })
      await queryClient.invalidateQueries({ queryKey: ['version', 'active'] })
      await queryClient.invalidateQueries({ queryKey: ['plu-items'] })
      setStep(3)
      toast.success('Version erfolgreich veröffentlicht!')
    } catch (err) {
      toast.error(`Veröffentlichung fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [user, targetKW, targetJahr, pieceComparison, weightComparison, conflicts, queryClient])

  const setConflictResolution = useCallback((index: number, resolution: ConflictItem['resolution']) => {
    setConflicts((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], resolution }
      return next
    })
  }, [])

  const totalSummary = {
    unchanged: (pieceComparison?.summary.unchanged ?? 0) + (weightComparison?.summary.unchanged ?? 0),
    newProducts: (pieceComparison?.summary.newProducts ?? 0) + (weightComparison?.summary.newProducts ?? 0),
    pluChanged: (pieceComparison?.summary.pluChanged ?? 0) + (weightComparison?.summary.pluChanged ?? 0),
    removed: (pieceComparison?.summary.removed ?? 0) + (weightComparison?.summary.removed ?? 0),
    conflicts: conflicts.length,
    total: (pieceComparison?.summary.total ?? 0) + (weightComparison?.summary.total ?? 0),
  }

  const allNewProducts: MasterPLUItem[] = [
    ...(pieceComparison?.newProducts ?? []),
    ...(weightComparison?.newProducts ?? []),
  ]
  const allRemoved: MasterPLUItem[] = [
    ...(pieceComparison?.removed ?? []),
    ...(weightComparison?.removed ?? []),
  ]

  return {
    step,
    setStep,
    pieceResult,
    weightResult,
    fileResults,
    setFileAssignment,
    removeFile,
    targetKW,
    setTargetKW,
    targetJahr,
    setTargetJahr,
    pieceComparison,
    weightComparison,
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
  }
}
