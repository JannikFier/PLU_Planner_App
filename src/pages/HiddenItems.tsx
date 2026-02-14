// HiddenItems – Eigene & Ausgeblendete Produkte (alle Rollen)

import { useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Undo2, EyeOff, Layers, Plus, FileSpreadsheet, Trash2 } from 'lucide-react'
import { useHiddenItems, useUnhideProduct, useUnhideAll, useHideProductsBatch, useHideProduct } from '@/hooks/useHiddenItems'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useCustomProducts, useAddCustomProductsBatch, useDeleteCustomProduct } from '@/hooks/useCustomProducts'
import { useBlocks } from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useAuth } from '@/hooks/useAuth'
import { formatPreisEur, generatePriceOnlyPlu, getDisplayPlu } from '@/lib/plu-helpers'
import { parseCustomProductsExcel, parseHiddenItemsExcel } from '@/lib/excel-parser'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CustomProductDialog } from '@/components/plu/CustomProductDialog'
import { HideProductsDialog } from '@/components/plu/HideProductsDialog'
import type { Profile } from '@/types/database'
import type { CustomProductParseResult, ParsedCustomProductRow } from '@/types/plu'

/** Zusammengeführte Info für ein ausgeblendetes Produkt */
interface HiddenProductInfo {
  plu: string
  name: string
  itemType: 'PIECE' | 'WEIGHT' | null
  source: 'master' | 'custom' | 'unknown'
  hidden_by: string
  hiddenByName: string
  hiddenAt: string
}

/**
 * HiddenItems-Seite: Eigene & Ausgeblendete – zwei Sektionen:
 * (1) Eigene Produkte (Liste + hinzufügen), (2) Ausgeblendete Produkte (Einblenden).
 */
/** Spalte 3 zu ItemType: Stück/Gewicht erkennen */
function parseBlockNameToItemType(s: string | null): 'PIECE' | 'WEIGHT' | null {
  if (!s || !s.trim()) return null
  const t = s.trim().toLowerCase()
  if (t.includes('gewicht')) return 'WEIGHT'
  if (t.includes('stück') || t.includes('stueck')) return 'PIECE'
  return null
}

export function HiddenItems() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const currentUserId = user?.id ?? null
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false)
  const [showHideProductsDialog, setShowHideProductsDialog] = useState(false)
  const [excelParseResult, setExcelParseResult] = useState<CustomProductParseResult | null>(null)
  const [excelOverrides, setExcelOverrides] = useState<Record<number, { block_id?: string | null; item_type?: 'PIECE' | 'WEIGHT' }>>({})
  const [hiddenExcelResult, setHiddenExcelResult] = useState<{ plus: string[]; fileName: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hiddenExcelFileInputRef = useRef<HTMLInputElement>(null)

  // Daten laden
  const { data: hiddenItems = [], isLoading: hiddenLoading } = useHiddenItems()
  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: customProducts = [], isLoading: customProductsLoading } = useCustomProducts()
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const addBatch = useAddCustomProductsBatch()
  const deleteProduct = useDeleteCustomProduct()
  const hideProduct = useHideProduct()
  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order_index - b.order_index), [blocks])

  // Alle PLUs (Master + Custom) für Duplikat-Prüfung im Dialog
  const existingPLUs = useMemo(
    () => new Set([...masterItems.map((m) => m.plu), ...customProducts.map((c) => c.plu)]),
    [masterItems, customProducts],
  )

  // Suchbare Items: Master + Custom, noch nicht ausgeblendet
  const hiddenPLUSet = useMemo(() => new Set(hiddenItems.map((h) => h.plu)), [hiddenItems])
  const searchableItems = useMemo(() => {
    const master: Array<{ id: string; plu: string; display_name: string; system_name?: string }> = masterItems
      .filter((m) => !hiddenPLUSet.has(m.plu))
      .map((m) => ({
        id: m.id,
        plu: m.plu,
        display_name: m.display_name ?? m.system_name,
        system_name: m.system_name,
      }))
    const custom: Array<{ id: string; plu: string; display_name: string; system_name?: string }> = customProducts
      .filter((c) => !hiddenPLUSet.has(c.plu))
      .map((c) => ({
        id: c.id,
        plu: c.plu,
        display_name: c.name,
        system_name: c.name,
      }))
    return [...master, ...custom]
  }, [masterItems, customProducts, hiddenPLUSet])
  // Profile laden für "Ausgeblendet von" Anzeige
  const hiddenByIds = useMemo(
    () => [...new Set(hiddenItems.map((h) => h.hidden_by))],
    [hiddenItems],
  )

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-hidden-by', hiddenByIds],
    queryFn: async () => {
      if (hiddenByIds.length === 0) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, personalnummer')
        .in('id', hiddenByIds)

      if (error) throw error
      return (data ?? []) as Pick<Profile, 'id' | 'display_name' | 'personalnummer'>[]
    },
    enabled: hiddenByIds.length > 0,
  })

  // Profilemap für schnelles Lookup
  const profileMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of profiles) {
      map.set(p.id, p.display_name ?? p.personalnummer)
    }
    return map
  }, [profiles])

  // Zusammengeführte Infos: hidden_items + Produktname + "ausgeblendet von"
  const hiddenProductInfos: HiddenProductInfo[] = useMemo(() => {
    return hiddenItems.map((hidden) => {
      // In Master suchen
      const masterItem = masterItems.find((m) => m.plu === hidden.plu)
      if (masterItem) {
        return {
          plu: hidden.plu,
          name: masterItem.display_name ?? masterItem.system_name,
          itemType: masterItem.item_type,
          source: 'master' as const,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }

      // In Custom Products suchen
      const customItem = customProducts.find((c) => c.plu === hidden.plu)
      if (customItem) {
        return {
          plu: hidden.plu,
          name: customItem.name,
          itemType: customItem.item_type,
          source: 'custom' as const,
          hidden_by: hidden.hidden_by,
          hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
          hiddenAt: hidden.created_at,
        }
      }

      // Produkt nicht mehr vorhanden (z.B. aus älterer KW)
      return {
        plu: hidden.plu,
        name: `PLU ${getDisplayPlu(hidden.plu)} (nicht mehr vorhanden)`,
        itemType: null,
        source: 'unknown' as const,
        hidden_by: hidden.hidden_by,
        hiddenByName: profileMap.get(hidden.hidden_by) ?? 'Unbekannt',
        hiddenAt: hidden.created_at,
      }
    })
  }, [hiddenItems, masterItems, customProducts, profileMap])

  // Mutations
  const unhideProduct = useUnhideProduct()
  const unhideAll = useUnhideAll()
  const hideBatch = useHideProductsBatch()

  const handleHiddenExcelFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await parseHiddenItemsExcel(file)
      if (result.plus.length === 0) {
        toast.error('Keine PLUs in der Excel-Datei gefunden.')
        return
      }
      setHiddenExcelResult(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden.')
    }
  }, [])

  const removePluFromHiddenExcel = useCallback((pluToRemove: string) => {
    setHiddenExcelResult((prev) => {
      if (!prev) return null
      const newPlus = prev.plus.filter((p) => p !== pluToRemove)
      return newPlus.length === 0 ? null : { ...prev, plus: newPlus }
    })
  }, [])

  /** Excel Ausblenden: Welche PLUs sind erkannt (existieren) vs. nicht erkannt */
  const hiddenExcelPreview = useMemo(() => {
    if (!hiddenExcelResult) return null
    const recognized: string[] = []
    const unrecognized: string[] = []
    for (const plu of hiddenExcelResult.plus) {
      if (masterItems.some((m) => m.plu === plu) || customProducts.some((c) => c.plu === plu)) {
        recognized.push(plu)
      } else {
        unrecognized.push(plu)
      }
    }
    return { recognized, unrecognized }
  }, [hiddenExcelResult, masterItems, customProducts])

  const handleHiddenExcelConfirm = useCallback(async () => {
    if (!hiddenExcelPreview || hiddenExcelPreview.recognized.length === 0) return
    try {
      await hideBatch.mutateAsync(hiddenExcelPreview.recognized)
      setHiddenExcelResult(null)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }, [hiddenExcelPreview, hideBatch])

  const handleExcelFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const result = await parseCustomProductsExcel(file)
      if (result.rows.length === 0) {
        toast.error('Keine gültigen Zeilen in der Excel-Datei gefunden.')
        return
      }
      setExcelParseResult(result)
      setExcelOverrides({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel konnte nicht gelesen werden.')
    }
  }, [])

  const setExcelOverride = useCallback((index: number, key: 'block_id' | 'item_type', value: string | null | 'PIECE' | 'WEIGHT') => {
    setExcelOverrides((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [key]: value === 'PIECE' || value === 'WEIGHT' ? value : (value as string | null) ?? undefined,
      },
    }))
  }, [])

  const resolveBlockIdForRow = useCallback(
    (row: ParsedCustomProductRow, index: number): string | null => {
      const override = excelOverrides[index]?.block_id
      if (override !== undefined) return override ?? null
      if (!row.blockNameOrType?.trim()) return null
      return sortedBlocks.find((b) => b.name === row.blockNameOrType?.trim())?.id ?? null
    },
    [excelOverrides, sortedBlocks],
  )

  const resolveItemTypeForRow = useCallback(
    (row: ParsedCustomProductRow, index: number): 'PIECE' | 'WEIGHT' => {
      const override = excelOverrides[index]?.item_type
      if (override) return override
      const parsed = parseBlockNameToItemType(row.blockNameOrType)
      return parsed ?? 'PIECE'
    },
    [excelOverrides],
  )

  const handleExcelAddAll = useCallback(async () => {
    if (!excelParseResult || excelParseResult.rows.length === 0) return
    const products: Array<{ plu: string; name: string; item_type: 'PIECE' | 'WEIGHT'; preis?: number | null; block_id?: string | null }> = []
    let skipped = 0
    for (let i = 0; i < excelParseResult.rows.length; i++) {
      const row = excelParseResult.rows[i]
      const plu = row.plu ?? generatePriceOnlyPlu()
      if (row.plu != null && existingPLUs.has(row.plu)) {
        skipped++
        continue
      }
      const item_type = sortMode === 'BY_BLOCK' ? 'PIECE' : resolveItemTypeForRow(row, i)
      const block_id =
        sortMode === 'BY_BLOCK'
          ? resolveBlockIdForRow(row, i) ?? sortedBlocks[0]?.id ?? null
          : excelOverrides[i]?.block_id ?? null
      products.push({
        plu,
        name: row.name,
        item_type,
        preis: row.preis ?? null,
        block_id: sortMode === 'BY_BLOCK' ? block_id ?? undefined : block_id ?? undefined,
      })
    }
    if (products.length === 0) {
      toast.error(skipped > 0 ? 'Alle PLUs sind bereits vergeben.' : 'Keine Produkte zum Hinzufügen.')
      return
    }
    try {
      await addBatch.mutateAsync(products)
      setExcelParseResult(null)
      setExcelOverrides({})
      if (skipped > 0) toast.info(`${skipped} Zeile(n) übersprungen (PLU bereits vergeben).`)
    } catch {
      // Fehler wird im Hook per Toast angezeigt
    }
  }, [excelParseResult, existingPLUs, sortMode, resolveItemTypeForRow, resolveBlockIdForRow, excelOverrides, addBatch, sortedBlocks])

  const closeExcelDialog = useCallback(() => {
    setExcelParseResult(null)
    setExcelOverrides({})
  }, [])

  /** Berechnet im Excel-Dialog: Wie viele Zeilen werden hinzugefügt vs. übersprungen (PLU bereits vergeben) */
  const excelAddPreview = useMemo(() => {
    if (!excelParseResult) return null
    let willAdd = 0
    let willSkip = 0
    const skipIndices = new Set<number>()
    for (let i = 0; i < excelParseResult.rows.length; i++) {
      const row = excelParseResult.rows[i]
      if (row.plu != null && existingPLUs.has(row.plu)) {
        willSkip++
        skipIndices.add(i)
      } else {
        willAdd++
      }
    }
    return { willAdd, willSkip, skipIndices }
  }, [excelParseResult, existingPLUs])

  // Routen-Prefix für Zurück-Navigation
  const rolePrefix = profile?.role === 'super_admin' ? '/super-admin' : profile?.role === 'admin' ? '/admin' : '/user'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${rolePrefix}/masterlist`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="rounded-lg p-2 bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Eigene & Ausgeblendete</h2>
              <p className="text-sm text-muted-foreground">
                Eigene Produkte verwalten und ausgeblendete wieder einblenden.
              </p>
            </div>
          </div>

          {hiddenItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unhideAll.mutate()}
              disabled={unhideAll.isPending}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Alle einblenden
            </Button>
          )}
        </div>

        {/* === Sektion 1: Eigene Produkte === */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold">Eigene Produkte</h3>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExcelFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Per Excel hochladen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomProductDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Eigenes Produkt hinzufügen
                </Button>
              </div>
            </div>

            {customProductsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            )}

            {!customProductsLoading && customProducts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Noch keine eigenen Produkte. Füge eines hinzu.
              </p>
            )}

            {!customProductsLoading && customProducts.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                      PLU
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                      Typ
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                      Preis
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                      Warengruppe
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customProducts.map((cp) => (
                    <tr
                      key={cp.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(cp.plu)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          {cp.name}
                          {currentUserId && cp.created_by === currentUserId && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Von mir erstellt
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cp.item_type === 'PIECE' ? 'Stück' : 'Gewicht'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cp.preis != null ? formatPreisEur(cp.preis) : '–'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {blocks.find((b) => b.id === cp.block_id)?.name ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => hideProduct.mutate(cp.plu)}
                            disabled={hideProduct.isPending}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Ausblenden
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteProduct.mutate(cp.id)}
                            disabled={deleteProduct.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Löschen
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* === Sektion 2: Ausgeblendete Produkte === */}
        <div className="flex flex-col gap-4 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold">Ausgeblendete Produkte</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHideProductsDialog(true)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Produkte ausblenden
              </Button>
              <input
                ref={hiddenExcelFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleHiddenExcelFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => hiddenExcelFileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Per Excel ausblenden
              </Button>
            </div>
          </div>
        </div>

        {hiddenLoading && (
          <Card>
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && hiddenItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <EyeOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine ausgeblendeten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Du hast noch keine Produkte aus der PLU-Liste ausgeblendet.
              </p>
            </CardContent>
          </Card>
        )}

        {!hiddenLoading && hiddenProductInfos.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                      PLU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Artikel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">
                      Typ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[150px]">
                      Ausgeblendet von
                    </th>
                    <th className="px-4 py-3 text-right w-[130px]" />
                  </tr>
                </thead>
                <tbody>
                  {hiddenProductInfos.map((info) => (
                    <tr
                      key={info.plu}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(info.plu)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          {info.name}
                          {info.source === 'custom' && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                              Eigen
                            </Badge>
                          )}
                          {info.source === 'unknown' && (
                            <Badge variant="secondary" className="text-xs">
                              Unbekannt
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {info.itemType === 'PIECE' ? 'Stück' : info.itemType === 'WEIGHT' ? 'Gewicht' : '–'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          {info.hiddenByName}
                          {currentUserId && info.hidden_by === currentUserId && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Von mir
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unhideProduct.mutate(info.plu)}
                          disabled={unhideProduct.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Einblenden
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <CustomProductDialog
          open={showCustomProductDialog}
          onOpenChange={setShowCustomProductDialog}
          existingPLUs={existingPLUs}
          blocks={blocks}
        />

        <HideProductsDialog
          open={showHideProductsDialog}
          onOpenChange={setShowHideProductsDialog}
          searchableItems={searchableItems}
        />

        <Dialog
          open={excelParseResult !== null}
          onOpenChange={(open) => {
            if (!open) closeExcelDialog()
          }}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Excel-Import – Eigene Produkte</DialogTitle>
              <DialogDescription>
                Vorschau der importierten Zeilen vor dem Hinzufügen.
              </DialogDescription>
            </DialogHeader>
            {excelParseResult && (
              <>
                <p className="text-sm text-muted-foreground">
                  {excelParseResult.fileName}: {excelParseResult.totalRows} Zeile(n) gelesen
                  {excelParseResult.skippedRows > 0 && `, ${excelParseResult.skippedRows} beim Einlesen übersprungen`}.
                  {sortMode === 'BY_BLOCK' ? ' Spalte 3 = Warengruppe.' : ' Spalte 3 = Stück/Gewicht.'}
                </p>
                {excelAddPreview && excelAddPreview.willSkip > 0 && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${excelAddPreview.willAdd === 0 ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <strong>Hinweis:</strong> {excelAddPreview.willSkip} Zeile(n) haben eine PLU, die bereits existiert.
                    {excelAddPreview.willAdd > 0 ? (
                      <> Diese werden übersprungen. Es werden {excelAddPreview.willAdd} Produkte importiert.</>
                    ) : (
                      <> Alle PLUs sind bereits vergeben. Es können keine Produkte hinzugefügt werden.</>
                    )}
                  </div>
                )}
                <div className="overflow-auto flex-1 min-h-0 border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold w-[100px]">PLU / Preis</th>
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold w-[140px]">
                          {sortMode === 'BY_BLOCK' ? 'Warengruppe' : 'Typ'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelParseResult.rows.map((row, i) => {
                        const blockId = sortMode === 'BY_BLOCK' ? resolveBlockIdForRow(row, i) : null
                        const itemType = sortMode === 'ALPHABETICAL' ? resolveItemTypeForRow(row, i) : null
                        const needsBlock = sortMode === 'BY_BLOCK' && !blockId && !row.blockNameOrType?.trim()
                        const needsType = sortMode === 'ALPHABETICAL' && !parseBlockNameToItemType(row.blockNameOrType)
                        const isDuplicate = excelAddPreview?.skipIndices.has(i)
                        return (
                          <tr key={i} className={isDuplicate ? 'border-b border-border bg-amber-50/50' : 'border-b border-border'}>
                            <td className="px-3 py-2 font-mono">
                              {row.plu != null ? row.plu : row.preis != null ? formatPreisEur(row.preis) : '–'}
                              {isDuplicate && (
                                <Badge variant="secondary" className="ml-2 text-xs bg-amber-200 text-amber-900">
                                  PLU bereits vergeben
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">
                              {sortMode === 'BY_BLOCK' ? (
                                <>
                                  {row.blockNameOrType && !blockId && (
                                    <Badge variant="secondary" className="mr-1 text-xs">
                                      Unbekannt
                                    </Badge>
                                  )}
                                  <Select
                                    value={blockId ?? excelOverrides[i]?.block_id ?? ''}
                                    onValueChange={(v) => setExcelOverride(i, 'block_id', v || null)}
                                  >
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue placeholder={needsBlock ? 'Warengruppe wählen' : '–'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sortedBlocks.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                          {b.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </>
                              ) : (
                                <>
                                  {needsType && (
                                    <Badge variant="secondary" className="mr-1 text-xs">
                                      Typ fehlt
                                    </Badge>
                                  )}
                                  <Select
                                    value={itemType ?? excelOverrides[i]?.item_type ?? ''}
                                    onValueChange={(v) => setExcelOverride(i, 'item_type', v as 'PIECE' | 'WEIGHT')}
                                  >
                                    <SelectTrigger className="h-8 w-full">
                                      <SelectValue placeholder="Typ wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PIECE">Stück</SelectItem>
                                      <SelectItem value="WEIGHT">Gewicht</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeExcelDialog}>
                Abbrechen
              </Button>
              <Button
                onClick={handleExcelAddAll}
                disabled={!excelParseResult?.rows.length || (excelAddPreview?.willAdd ?? 0) === 0 || addBatch.isPending}
              >
                {addBatch.isPending
                  ? 'Wird hinzugefügt...'
                  : excelAddPreview && excelAddPreview.willSkip > 0
                    ? `${excelAddPreview.willAdd} Produkte hinzufügen (${excelAddPreview.willSkip} übersprungen)`
                    : `${excelParseResult?.rows.length ?? 0} Produkte hinzufügen`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={hiddenExcelResult !== null}
          onOpenChange={(open) => {
            if (!open) setHiddenExcelResult(null)
          }}
        >
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Diese Produkte werden ausgeblendet</DialogTitle>
              <DialogDescription>
                PLUs aus der Excel-Datei – prüfe ob alle erkannt wurden. Nicht gefundene können entfernt werden.
              </DialogDescription>
            </DialogHeader>
            {hiddenExcelResult && hiddenExcelPreview && (
              <>
                <p className="text-sm text-muted-foreground">
                  {hiddenExcelResult.fileName}: {hiddenExcelResult.plus.length} PLU(s) ausgelesen.
                </p>
                {hiddenExcelPreview.unrecognized.length > 0 && (
                  <div className={`rounded-lg border px-4 py-3 text-sm ${hiddenExcelPreview.recognized.length === 0 ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    <strong>Hinweis:</strong> {hiddenExcelPreview.unrecognized.length} PLU(s) wurden nicht gefunden.
                    {hiddenExcelPreview.recognized.length > 0 ? (
                      <> Diese Zeilen können entfernt werden. {hiddenExcelPreview.recognized.length} Produkte werden ausgeblendet.</>
                    ) : (
                      <> Keine gültigen Produkte zum Ausblenden. Prüfe die PLU-Nummern in der Excel oder entferne die Zeilen.</>
                    )}
                  </div>
                )}
                <ul className="max-h-[280px] overflow-auto border rounded-md py-1 space-y-0.5">
                  {hiddenExcelResult.plus.map((plu) => {
                    const masterItem = masterItems.find((m) => m.plu === plu)
                    const customItem = customProducts.find((c) => c.plu === plu)
                    const name = masterItem
                      ? (masterItem.display_name ?? masterItem.system_name)
                      : customItem
                        ? customItem.name
                        : null
                    const isUnrecognized = !name
                    return (
                      <li
                        key={plu}
                        className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 group ${isUnrecognized ? 'bg-amber-50/50' : ''}`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-mono shrink-0 w-20">{getDisplayPlu(plu)}</span>
                          {name ? (
                            <span className="truncate text-muted-foreground">{name}</span>
                          ) : (
                            <Badge variant="secondary" className="text-xs shrink-0 bg-amber-200 text-amber-900">
                              Nicht gefunden
                            </Badge>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0 opacity-70 group-hover:opacity-100"
                          onClick={() => removePluFromHiddenExcel(plu)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setHiddenExcelResult(null)}>
                Abbrechen
              </Button>
              <Button
                onClick={handleHiddenExcelConfirm}
                disabled={!hiddenExcelPreview?.recognized.length || hideBatch.isPending}
              >
                {hideBatch.isPending
                  ? 'Wird ausgeblendet...'
                  : hiddenExcelPreview
                    ? `${hiddenExcelPreview.recognized.length} Produkt${hiddenExcelPreview.recognized.length === 1 ? '' : 'e'} ausblenden`
                    : 'Ausblenden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
