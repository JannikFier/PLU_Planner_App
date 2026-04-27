// Zustand und abgeleitete Daten für den mehrstufigen Backshop-Upload (eine Session pro Quelle).

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBackshopUpload } from '@/hooks/useBackshopUpload'
import { useBackshopBlocks, useBackshopBlockRules } from '@/hooks/useBackshopBlocks'
import { useBackshopLayoutSettings } from '@/hooks/useBackshopLayoutSettings'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { suggestBlockIdsForUnassignedItems } from '@/lib/backshop-upload-block-suggest'
import { backshopItemsToDisplayItems } from '@/lib/backshop-upload-wizard-formatters'
import type { BackshopCompareItem, BackshopComparisonResult, DisplayItem } from '@/types/plu'
import type { BackshopExcelSource } from '@/lib/backshop-sources'
import type { BackshopBlock } from '@/types/database'
import { BACKSHOP_UPLOAD_WIZARD_BASE } from '@/lib/backshop-upload-wizard-paths'

export interface BackshopUploadWizardContextValue {
  source: BackshopExcelSource
  basePath: string
  step: ReturnType<typeof useBackshopUpload>['step']
  setStep: ReturnType<typeof useBackshopUpload>['setStep']
  fileResults: ReturnType<typeof useBackshopUpload>['fileResults']
  removeFile: ReturnType<typeof useBackshopUpload>['removeFile']
  targetKW: ReturnType<typeof useBackshopUpload>['targetKW']
  setTargetKW: ReturnType<typeof useBackshopUpload>['setTargetKW']
  targetJahr: ReturnType<typeof useBackshopUpload>['targetJahr']
  setTargetJahr: ReturnType<typeof useBackshopUpload>['setTargetJahr']
  comparison: ReturnType<typeof useBackshopUpload>['comparison']
  isProcessing: ReturnType<typeof useBackshopUpload>['isProcessing']
  isAddingFiles: ReturnType<typeof useBackshopUpload>['isAddingFiles']
  imageUploadProgress: ReturnType<typeof useBackshopUpload>['imageUploadProgress']
  publishResult: ReturnType<typeof useBackshopUpload>['publishResult']
  reset: ReturnType<typeof useBackshopUpload>['reset']
  handleFilesSelected: ReturnType<typeof useBackshopUpload>['handleFilesSelected']
  startComparison: ReturnType<typeof useBackshopUpload>['startComparison']
  handlePublish: ReturnType<typeof useBackshopUpload>['handlePublish']
  overwriteConfirmOpen: ReturnType<typeof useBackshopUpload>['overwriteConfirmOpen']
  setOverwriteConfirmOpen: ReturnType<typeof useBackshopUpload>['setOverwriteConfirmOpen']
  unmatchedProducts: ReturnType<typeof useBackshopUpload>['unmatchedProducts']
  assignImageToProduct: ReturnType<typeof useBackshopUpload>['assignImageToProduct']
  columnPreview: ReturnType<typeof useBackshopUpload>['columnPreview']
  openColumnMapping: ReturnType<typeof useBackshopUpload>['openColumnMapping']
  closeColumnMapping: ReturnType<typeof useBackshopUpload>['closeColumnMapping']
  applyColumnMapping: ReturnType<typeof useBackshopUpload>['applyColumnMapping']
  imageDialogOpen: boolean
  setImageDialogOpen: (v: boolean) => void
  handleImageDialogOpenChange: (open: boolean) => void
  imageAssignmentCompleted: boolean
  blockAssignments: Record<string, string | null>
  setBlockAssignments: React.Dispatch<React.SetStateAction<Record<string, string | null>>>
  keepRemoved: Set<string>
  toggleKeepRemoved: (plu: string, keep: boolean) => void
  expandNew: boolean
  setExpandNew: (v: boolean | ((p: boolean) => boolean)) => void
  expandRemoved: boolean
  setExpandRemoved: (v: boolean | ((p: boolean) => boolean)) => void
  newProducts: BackshopCompareItem[]
  suggestedMap: Map<string, string>
  itemsNeedingAssignment: BackshopCompareItem[]
  sortedBlocks: BackshopBlock[]
  previewDisplayItems: DisplayItem[]
  summary: BackshopComparisonResult['summary'] | undefined
  hasConflicts: boolean
  canProceedAssign: boolean
  backshopSortMode: 'ALPHABETICAL' | 'BY_BLOCK'
  handlePublishWithBlocks: () => Promise<boolean>
  handleFinish: () => void
  navigateToHub: () => void
}

// Kontext-Instanz für useBackshopUploadWizard – kein eigenes HMR-Modul, damit Wert-Interface nahe am Provider bleibt
// eslint-disable-next-line react-refresh/only-export-components
export const BackshopUploadWizardContext = createContext<BackshopUploadWizardContextValue | null>(null)

export function BackshopUploadWizardProvider({ source, children }: { source: BackshopExcelSource; children: ReactNode }) {
  const navigate = useNavigate()
  const basePath = `${BACKSHOP_UPLOAD_WIZARD_BASE}/${source}`

  const upload = useBackshopUpload({ source })
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
    columnPreview,
    openColumnMapping,
    closeColumnMapping,
    applyColumnMapping,
  } = upload

  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageAssignmentCompleted, setImageAssignmentCompleted] = useState(false)
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: blockRules = [] } = useBackshopBlockRules()
  const { data: backshopLayoutSettings } = useBackshopLayoutSettings()
  const backshopSortMode = backshopLayoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const { data: activeBackshopVersion } = useActiveBackshopVersion()
  const { data: currentBackshopItems = [] } = useBackshopPLUData(
    step === 3 || step === 4 ? activeBackshopVersion?.id : undefined,
  )
  const [blockAssignments, setBlockAssignments] = useState<Record<string, string | null>>({})
  const lastSeededComparisonRef = useRef<string>('')

  useEffect(() => {
    if (!isAddingFiles && unmatchedProducts.length > 0) {
      queueMicrotask(() => {
        setImageDialogOpen(true)
        setImageAssignmentCompleted(false)
      })
    }
  }, [isAddingFiles, unmatchedProducts.length])

  const handleImageDialogOpenChange = useCallback((open: boolean) => {
    setImageDialogOpen(open)
    if (!open) setImageAssignmentCompleted(true)
  }, [])

  const [keepRemoved, setKeepRemoved] = useState<Set<string>>(new Set())
  const [expandNew, setExpandNew] = useState(false)
  const [expandRemoved, setExpandRemoved] = useState(false)

  const newProducts = useMemo(() => {
    if (!comparison?.allItems?.length) return []
    return comparison.allItems.filter((i) => i.status === 'NEW_PRODUCT_YELLOW')
  }, [comparison])

  const suggestedMap = useMemo(() => {
    if (!comparison?.allItems?.length || !blocks.length) return new Map<string, string>()
    return suggestBlockIdsForUnassignedItems(comparison.allItems, blocks, blockRules)
  }, [comparison, blocks, blockRules])

  const itemsNeedingAssignment = useMemo(() => {
    if (!comparison?.allItems?.length) return []
    return comparison.allItems.filter(
      (i) => i.status === 'NEW_PRODUCT_YELLOW' || i.block_id == null || i.block_id === '',
    )
  }, [comparison])

  useEffect(() => {
    if ((step !== 3 && step !== 4) || !comparison?.allItems?.length) return
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
    if (step !== 4 || !comparison?.allItems?.length) return []
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
  const canProceedAssign =
    !hasConflicts && (newProducts.length === 0 || newProducts.every((p) => blockAssignments[p.plu] !== undefined))

  const handlePublishWithBlocks = useCallback(async (): Promise<boolean> => {
    if (!comparison) return false
    const toBlockId = (v: string | null | undefined): string | null => {
      if (v == null || v === '' || v === '__none__') return null
      return v
    }
    const itemsWithBlocks: BackshopCompareItem[] = comparison.allItems.map((item) => ({
      ...item,
      block_id: toBlockId(
        blockAssignments[item.plu] ?? suggestedMap.get(item.plu) ?? item.block_id ?? null,
      ),
    }))
    const keptRemovedItems = comparison.removed.filter((r) => keepRemoved.has(r.plu))
    return handlePublish([...itemsWithBlocks, ...keptRemovedItems])
  }, [comparison, blockAssignments, suggestedMap, keepRemoved, handlePublish])

  const toggleKeepRemoved = useCallback((plu: string, keep: boolean) => {
    setKeepRemoved((prev) => {
      const next = new Set(prev)
      if (keep) next.add(plu)
      else next.delete(plu)
      return next
    })
  }, [])

  const handleFinish = useCallback(() => {
    reset()
    navigate('/super-admin/backshop-list')
  }, [reset, navigate])

  const navigateToHub = useCallback(() => {
    navigate(BACKSHOP_UPLOAD_WIZARD_BASE)
  }, [navigate])

  const value: BackshopUploadWizardContextValue = {
    source,
    basePath,
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
    columnPreview,
    openColumnMapping,
    closeColumnMapping,
    applyColumnMapping,
    imageDialogOpen,
    setImageDialogOpen,
    handleImageDialogOpenChange,
    imageAssignmentCompleted,
    blockAssignments,
    setBlockAssignments,
    keepRemoved,
    toggleKeepRemoved,
    expandNew,
    setExpandNew,
    expandRemoved,
    setExpandRemoved,
    newProducts,
    suggestedMap,
    itemsNeedingAssignment,
    sortedBlocks,
    previewDisplayItems,
    summary,
    hasConflicts,
    canProceedAssign,
    backshopSortMode,
    handlePublishWithBlocks,
    handleFinish,
    navigateToHub,
  }

  return (
    <BackshopUploadWizardContext.Provider value={value}>{children}</BackshopUploadWizardContext.Provider>
  )
}
