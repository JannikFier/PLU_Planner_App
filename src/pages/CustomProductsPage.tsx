// CustomProductsPage – Eigene Produkte (dedizierte Seite)
// Liste, hinzufügen, bearbeiten, ausblenden, löschen, Excel-Import

import { useMemo, useState, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, EyeOff, Layers, FileSpreadsheet, Trash2, Pencil } from 'lucide-react'
import { useCustomProducts, useAddCustomProductsBatch, useDeleteCustomProduct } from '@/hooks/useCustomProducts'
import { useHiddenItems, useHideProduct, useUnhideProduct } from '@/hooks/useHiddenItems'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useBlocks } from '@/hooks/useBlocks'
import { useLayoutSettings } from '@/hooks/useLayoutSettings'
import { useAuth } from '@/hooks/useAuth'
import { formatPreisEur, getDisplayPlu, generatePriceOnlyPlu } from '@/lib/plu-helpers'
import { parseCustomProductsExcel } from '@/lib/excel-parser'
import { toast } from 'sonner'
import { CustomProductDialog } from '@/components/plu/CustomProductDialog'
import { ExcelPreviewBox } from '@/components/plu/ExcelPreviewBox'
import { EditCustomProductDialog } from '@/components/plu/EditCustomProductDialog'
import type { CustomProduct } from '@/types/database'
import type { CustomProductParseResult, ParsedCustomProductRow } from '@/types/plu'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { parseBlockNameToItemType } from '@/lib/plu-helpers'

export function CustomProductsPage() {
  const { user, isSuperAdmin } = useAuth()
  const currentUserId = user?.id ?? null

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CustomProduct | null>(null)
  const [productToDelete, setProductToDelete] = useState<CustomProduct | null>(null)
  const [excelParseResult, setExcelParseResult] = useState<CustomProductParseResult | null>(null)
  const [excelOverrides, setExcelOverrides] = useState<Record<number, { block_id?: string | null; item_type?: 'PIECE' | 'WEIGHT' }>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: activeVersion } = useActiveVersion()
  const { data: customProducts = [], isLoading } = useCustomProducts()
  const { data: hiddenItems = [] } = useHiddenItems()
  const { data: masterItems = [] } = usePLUData(activeVersion?.id)
  const { data: blocks = [] } = useBlocks()
  const { data: layoutSettings } = useLayoutSettings()
  const addBatch = useAddCustomProductsBatch()
  const deleteProduct = useDeleteCustomProduct()
  const hideProduct = useHideProduct()
  const unhideProduct = useUnhideProduct()

  const sortMode = layoutSettings?.sort_mode ?? 'ALPHABETICAL'
  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order_index - b.order_index), [blocks])

  const existingPLUs = useMemo(
    () => new Set([...masterItems.map((m) => m.plu), ...customProducts.map((c) => c.plu)]),
    [masterItems, customProducts],
  )

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
      const block_id = sortMode === 'BY_BLOCK' ? resolveBlockIdForRow(row, i) ?? sortedBlocks[0]?.id ?? null : excelOverrides[i]?.block_id ?? null
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Eigene Produkte</h2>
              <p className="text-sm text-muted-foreground">
                Eigene Produkte hinzufügen, bearbeiten, ausblenden und löschen.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {isSuperAdmin && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleExcelFileSelect}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Per Excel hochladen
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Eigenes Produkt hinzufügen
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            {isLoading && (
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

            {!isLoading && customProducts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Noch keine eigenen Produkte. Füge eines hinzu.
              </p>
            )}

            {!isLoading && customProducts.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Typ</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Preis</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Warengruppe</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {customProducts.map((cp) => {
                    const isHidden = hiddenItems.some((h) => h.plu === cp.plu)
                    return (
                      <tr key={cp.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(cp.plu)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            {cp.name}
                            {currentUserId && cp.created_by === currentUserId && (
                              <Badge variant="secondary" className="text-xs shrink-0">Von mir erstellt</Badge>
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm" onClick={() => setEditingProduct(cp)} aria-label="Bearbeiten">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Name, Typ und Preis bearbeiten</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => (isHidden ? unhideProduct.mutate(cp.plu) : hideProduct.mutate(cp.plu))}
                                  disabled={hideProduct.isPending || unhideProduct.isPending}
                                  aria-label={isHidden ? 'Einblenden' : 'Ausblenden'}
                                >
                                  {isHidden ? (
                                    <Eye className="h-3.5 w-3.5" />
                                  ) : (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isHidden ? 'Produkt in der PLU-Liste wieder einblenden' : 'Produkt aus der PLU-Liste ausblenden'}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setProductToDelete(cp)}
                                  disabled={deleteProduct.isPending}
                                  aria-label="Löschen"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Produkt unwiderruflich löschen</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <CustomProductDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          existingPLUs={existingPLUs}
          blocks={blocks}
        />

        {editingProduct && (
          <EditCustomProductDialog
            key={editingProduct.id}
            open={!!editingProduct}
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
            blocks={blocks}
          />
        )}

        <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Produkt löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{productToDelete?.name}&quot; unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (productToDelete) {
                    deleteProduct.mutate(productToDelete.id)
                    setProductToDelete(null)
                  }
                }}
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Excel Import Dialog – aus HiddenItems übernommen */}
        <Dialog open={excelParseResult !== null} onOpenChange={(open) => !open && setExcelParseResult(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Excel-Import – Eigene Produkte</DialogTitle>
              <DialogDescription>
                Vorschau der importierten Zeilen vor dem Hinzufügen.
              </DialogDescription>
            </DialogHeader>
            {excelParseResult && excelAddPreview && (
              <>
                <p className="text-sm text-muted-foreground">
                  {excelParseResult.fileName}: {excelParseResult.totalRows} Zeile(n) gelesen
                  {excelParseResult.skippedRows > 0 && `, ${excelParseResult.skippedRows} beim Einlesen übersprungen`}.
                  {sortMode === 'BY_BLOCK' ? ' Spalte 3 = Warengruppe.' : ' Spalte 3 = Stück/Gewicht.'}
                </p>
                {excelAddPreview.willSkip > 0 && (
                  <ExcelPreviewBox variant={excelAddPreview.willAdd === 0 ? 'error' : 'warning'}>
                    <strong>Hinweis:</strong> {excelAddPreview.willSkip} Zeile(n) haben eine PLU, die bereits existiert.
                    {excelAddPreview.willAdd > 0 ? <> Diese werden übersprungen. Es werden {excelAddPreview.willAdd} Produkte importiert.</> : <> Alle PLUs sind bereits vergeben.</>}
                  </ExcelPreviewBox>
                )}
                <div className="overflow-auto flex-1 min-h-0 border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold w-[100px]">PLU / Preis</th>
                        <th className="px-3 py-2 text-left font-semibold">Name</th>
                        <th className="px-3 py-2 text-left font-semibold w-[140px]">{sortMode === 'BY_BLOCK' ? 'Warengruppe' : 'Typ'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {excelParseResult.rows.map((row, i) => {
                        const blockId = sortMode === 'BY_BLOCK' ? resolveBlockIdForRow(row, i) : null
                        const itemType = sortMode === 'ALPHABETICAL' ? resolveItemTypeForRow(row, i) : null
                        const needsBlock = sortMode === 'BY_BLOCK' && !blockId && !row.blockNameOrType?.trim()
                        const isDuplicate = excelAddPreview.skipIndices.has(i)
                        return (
                          <tr key={i} className={isDuplicate ? 'border-b border-border bg-amber-50/50' : 'border-b border-border'}>
                            <td className="px-3 py-2 font-mono">
                              {row.plu != null ? row.plu : row.preis != null ? formatPreisEur(row.preis) : '–'}
                              {isDuplicate && <Badge variant="secondary" className="ml-2 text-xs bg-amber-200 text-amber-900">PLU bereits vergeben</Badge>}
                            </td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">
                              {sortMode === 'BY_BLOCK' ? (
                                <Select value={blockId ?? excelOverrides[i]?.block_id ?? ''} onValueChange={(v) => setExcelOverride(i, 'block_id', v || null)}>
                                  <SelectTrigger className="h-8 w-full">
                                    <SelectValue placeholder={needsBlock ? 'Warengruppe wählen' : '–'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortedBlocks.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select value={itemType ?? excelOverrides[i]?.item_type ?? ''} onValueChange={(v) => setExcelOverride(i, 'item_type', v as 'PIECE' | 'WEIGHT')}>
                                  <SelectTrigger className="h-8 w-full">
                                    <SelectValue placeholder="Typ wählen" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PIECE">Stück</SelectItem>
                                    <SelectItem value="WEIGHT">Gewicht</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExcelParseResult(null)}>Abbrechen</Button>
                  <Button
                    onClick={handleExcelAddAll}
                    disabled={excelAddPreview.willAdd === 0 || addBatch.isPending}
                  >
                    {addBatch.isPending ? 'Wird hinzugefügt...' : excelAddPreview.willSkip > 0 ? `${excelAddPreview.willAdd} Produkte hinzufügen (${excelAddPreview.willSkip} übersprungen)` : `${excelParseResult.rows.length} Produkte hinzufügen`}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
