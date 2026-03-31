// Backshop: Eigene Produkte (Bild Pflicht), Ausblenden, Bearbeiten, Löschen

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'
import { useBackshopCustomProducts, useDeleteBackshopCustomProduct } from '@/hooks/useBackshopCustomProducts'
import { useBackshopHiddenItems, useBackshopHideProduct, useBackshopUnhideProduct } from '@/hooks/useBackshopHiddenItems'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useAuth } from '@/hooks/useAuth'
import { useEffectiveRouteRole } from '@/hooks/useEffectiveRouteRole'
import { canManageMarketHiddenItems } from '@/lib/permissions'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { BackshopCustomProductsList } from '@/components/plu/BackshopCustomProductsList'
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
export function BackshopCustomProductsPage() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const effectiveRole = useEffectiveRouteRole()
  const canHideUnhide = canManageMarketHiddenItems(effectiveRole, pathname)

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
              <BackshopCustomProductsList
                products={customProducts}
                blocks={blocks}
                currentUserId={user?.id ?? null}
                isHidden={(plu) => hiddenItems.some((h) => h.plu === plu)}
                onEdit={(cp) => setEditingProduct(cp)}
                onDelete={(cp) => setProductToDelete(cp)}
                onHide={(plu) => hideProduct.mutate(plu)}
                onUnhide={(plu) => unhideProduct.mutate(plu)}
                hidePending={hideProduct.isPending}
                unhidePending={unhideProduct.isPending}
                deletePending={deleteProduct.isPending}
                allowHideUnhide={canHideUnhide}
              />
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
