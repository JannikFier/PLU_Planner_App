// Backshop: Umbenannte Produkte (Admin/Super-Admin), inkl. Bild im Umbenennen-Dialog

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Pencil, Undo2 } from 'lucide-react'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useResetBackshopProductName } from '@/hooks/useBackshopRename'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { RenameProductsDialog } from '@/components/plu/RenameProductsDialog'
import type { BackshopMasterPLUItem } from '@/types/database'

export function BackshopRenamedProductsPage() {
  useAuth()
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [resetConfirmItem, setResetConfirmItem] = useState<BackshopMasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [], isLoading: itemsLoading } = useBackshopPLUData(activeVersion?.id)
  const resetName = useResetBackshopProductName()

  const renamedItems = useMemo(
    () => masterItems.filter((m) => m.is_manually_renamed === true),
    [masterItems],
  )

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    const systemName = resetConfirmItem.system_name?.trim()
    if (!systemName) return
    try {
      await resetName.mutateAsync({
        item_id: resetConfirmItem.id,
        system_name: systemName,
      })
      setResetConfirmItem(null)
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
              <Pencil className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Umbenannte Produkte (Backshop)</h2>
              <p className="text-sm text-muted-foreground">
                Anzeigenamen und optional Bilder anpassen oder auf das Original zurücksetzen.
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowRenameDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Produkte umbenennen
          </Button>
        </div>

        {itemsLoading && (
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

        {!itemsLoading && renamedItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Pencil className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-1">Keine umbenannten Produkte</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Klicke auf „Produkte umbenennen“, um Anzeigenamen und optional Bilder in der Backshop-Liste zu ändern.
              </p>
            </CardContent>
          </Card>
        )}

        {!itemsLoading && renamedItems.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">PLU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Original</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktuell</th>
                    <th className="px-4 py-3 text-right w-[160px]" />
                  </tr>
                </thead>
                <tbody>
                  {renamedItems.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm">{getDisplayPlu(item.plu)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.system_name}</td>
                      <td className="px-4 py-3 text-sm">{item.display_name ?? item.system_name}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetConfirmItem(item)}
                          disabled={resetName.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Zurücksetzen
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <RenameProductsDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          searchableItems={masterItems}
          listType="backshop"
        />

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Aus Liste entfernen?'
                  : 'Produktnamen zurücksetzen?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {resetConfirmItem && (resetConfirmItem.display_name ?? resetConfirmItem.system_name) === resetConfirmItem.system_name
                  ? 'Das Produkt wird aus der Liste „Umbenannte Produkte“ entfernt (nur die Einstellung „umbenannt“ wird zurückgesetzt). Name und Bild bleiben unverändert.'
                  : `Der Anzeigename wird wieder auf „${resetConfirmItem?.system_name}“ gesetzt. Das Bild bleibt unverändert.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetConfirm} disabled={resetName.isPending}>
                {resetName.isPending ? 'Wird zurückgesetzt…' : 'Zurücksetzen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}
