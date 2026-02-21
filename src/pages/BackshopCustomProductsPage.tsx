// Backshop: Eigene Produkte (Bild Pflicht), Ausblenden, Bearbeiten, Löschen

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye, EyeOff, Trash2, Pencil } from 'lucide-react'
import { useBackshopCustomProducts, useDeleteBackshopCustomProduct } from '@/hooks/useBackshopCustomProducts'
import { useBackshopHiddenItems, useBackshopHideProduct, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { BackshopCustomProductDialog } from '@/components/plu/BackshopCustomProductDialog'
import { EditBackshopCustomProductDialog } from '@/components/plu/EditBackshopCustomProductDialog'
import type { BackshopCustomProduct } from '@/types/database'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function BackshopCustomProductsPage() {
  const { user } = useAuth()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BackshopCustomProduct | null>(null)
  const [productToDelete, setProductToDelete] = useState<BackshopCustomProduct | null>(null)

  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: customProducts = [], isLoading } = useBackshopCustomProducts()
  const { data: hiddenItems = [] } = useBackshopHiddenItems()
  const { data: masterItems = [] } = useBackshopPLUData(activeVersion?.id)
  const { data: blocks = [] } = useBackshopBlocks()

  const deleteProduct = useDeleteBackshopCustomProduct()
  const hideProduct = useBackshopHideProduct()
  const unhideProduct = useBackshopUnhideProduct()

  const existingPLUs = useMemo(
    () => new Set([...masterItems.map((m) => m.plu), ...customProducts.map((c) => c.plu)]),
    [masterItems, customProducts],
  )

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      await deleteProduct.mutateAsync(productToDelete.id)
      setProductToDelete(null)
    } catch {
      // Toast im Hook
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2 bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Eigene Produkte (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Eigene Backshop-Produkte mit Bild hinzufügen, bearbeiten, ausblenden und löschen.
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Eigenes Produkt hinzufügen
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && customProducts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Noch keine eigenen Backshop-Produkte. Füge eines hinzu (mit Bild).
              </p>
            )}

            {!isLoading && customProducts.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Bild</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Warengruppe</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[180px]">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {customProducts.map((cp) => {
                    const isHidden = hiddenItems.some((h) => h.plu === cp.plu)
                    return (
                      <tr key={cp.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {cp.image_url ? (
                            <img
                              src={cp.image_url}
                              alt=""
                              className="h-12 w-12 object-contain rounded border border-border"
                            />
                          ) : (
                            <span className="inline-block h-12 w-12 rounded border border-border bg-muted/50 text-muted-foreground text-xs flex items-center justify-center">–</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(cp.plu)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="flex items-center gap-2">
                            {cp.name}
                            {user && cp.created_by === user.id && (
                              <Badge variant="secondary" className="text-xs shrink-0">Von mir</Badge>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {blocks.find((b) => b.id === cp.block_id)?.name ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setEditingProduct(cp)} aria-label="Bearbeiten">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Name und Bild bearbeiten</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => (isHidden ? unhideProduct.mutate(cp.plu) : hideProduct.mutate(cp.plu))}
                                  disabled={hideProduct.isPending || unhideProduct.isPending}
                                  aria-label={isHidden ? 'Einblenden' : 'Ausblenden'}
                                >
                                  {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isHidden ? 'Einblenden' : 'Ausblenden'}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setProductToDelete(cp)}
                                  aria-label="Löschen"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Produkt löschen</TooltipContent>
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

        <BackshopCustomProductDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          existingPLUs={existingPLUs}
          blocks={blocks}
        />

        {editingProduct && (
          <EditBackshopCustomProductDialog
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
              <AlertDialogTitle>Eigenes Produkt löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                {productToDelete && (
                  <>„{productToDelete.name}“ (PLU {getDisplayPlu(productToDelete.plu)}) wird dauerhaft gelöscht.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
