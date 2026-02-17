// RenamedProductsPage – Umbenannte Produkte (Admin/Super-Admin)
// Liste der umbenannten Master-Items, „Produkte umbenennen“-Dialog, Zurücksetzen mit Bestätigung

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { ArrowLeft, Pencil, Undo2 } from 'lucide-react'
import { useActiveVersion } from '@/hooks/useActiveVersion'
import { usePLUData } from '@/hooks/usePLUData'
import { useResetProductName } from '@/hooks/useCustomProducts'
import { useAuth } from '@/hooks/useAuth'
import { getDisplayPlu } from '@/lib/plu-helpers'
import { RenameProductsDialog } from '@/components/plu/RenameProductsDialog'
import type { MasterPLUItem } from '@/types/database'

export function RenamedProductsPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [resetConfirmItem, setResetConfirmItem] = useState<MasterPLUItem | null>(null)

  const { data: activeVersion } = useActiveVersion()
  const { data: masterItems = [], isLoading: itemsLoading } = usePLUData(activeVersion?.id)
  const resetName = useResetProductName()

  const renamedItems = useMemo(
    () => masterItems.filter((m) => m.is_manually_renamed === true),
    [masterItems],
  )

  const rolePrefix =
    profile?.role === 'super_admin' ? '/super-admin' : profile?.role === 'admin' ? '/admin' : '/user'

  const handleResetConfirm = async () => {
    if (!resetConfirmItem) return
    try {
      await resetName.mutateAsync({ id: resetConfirmItem.id, systemName: resetConfirmItem.system_name })
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${rolePrefix}/masterlist`)}
              aria-label="Zurück"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="rounded-lg p-2 bg-muted">
              <Pencil className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Umbenannte Produkte</h2>
              <p className="text-sm text-muted-foreground">
                Anzeigenamen anpassen oder auf das Original zurücksetzen.
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
                Klicke oben rechts auf „Produkte umbenennen“, um Anzeigenamen in der PLU-Liste zu
                ändern.
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">
                      PLU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Original
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Aktuell
                    </th>
                    <th className="px-4 py-3 text-right w-[160px]" />
                  </tr>
                </thead>
                <tbody>
                  {renamedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-sm">
                        {getDisplayPlu(item.plu)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.system_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.display_name ?? item.system_name}
                      </td>
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
        />

        <AlertDialog open={!!resetConfirmItem} onOpenChange={(open) => !open && setResetConfirmItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Produktnamen zurücksetzen?</AlertDialogTitle>
              <AlertDialogDescription>
                Der Anzeigename wird wieder auf das Original „
                {resetConfirmItem?.system_name}“ gesetzt.
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
