import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine, Loader2 } from 'lucide-react'
import { useStoreKioskRegisters, type KioskRegister } from '@/hooks/useStoreKioskRegisters'
import { useKioskRegisterMutations } from '@/hooks/useKioskRegisterMutations'
import { KioskRegisterRowEditor } from '@/components/admin/KioskRegisterRowEditor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  storeId: string
}

/**
 * Kassen dieses Marktes in der Benutzerverwaltung – gleiche Bedienung wie im Kassenmodus.
 */
export function UserManagementKioskRegistersCard({ storeId }: Props) {
  const registersQuery = useStoreKioskRegisters(storeId)
  const { updateRegisterMutation, deleteMutation } = useKioskRegisterMutations(storeId, {
    extraInvalidatePrefixes: [['all-profiles'], ['company-profiles']],
  })
  const [deleteTarget, setDeleteTarget] = useState<KioskRegister | null>(null)

  const registers = registersQuery.data ?? []
  const loading = registersQuery.isLoading

  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-4 w-4 shrink-0" aria-hidden />
            Kassen &amp; QR
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              QR-Code drucken und neue Kassen im Kassenmodus anlegen. Kassen-Konten erscheinen hier, nicht in der Liste
              „Alle Benutzer“. Passwort ändern, aktivieren/deaktivieren und löschen wie im Kassenmodus.
            </p>
            <Button variant="secondary" asChild className="shrink-0 self-start sm:self-auto">
              <Link to="/admin/kassenmodus">Zum Kassenmodus</Link>
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : registers.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
              Für diesen Markt ist noch keine Kasse angelegt. Neue Kassen legst du im Kassenmodus an.
            </p>
          ) : (
            <div className="space-y-4">
              {registers.map((reg) => (
                <KioskRegisterRowEditor
                  key={reg.id}
                  register={reg}
                  onSavePassword={(pw) => updateRegisterMutation.mutate({ register_id: reg.id, password: pw })}
                  onToggleActive={(active) => updateRegisterMutation.mutate({ register_id: reg.id, active })}
                  onDelete={() => setDeleteTarget(reg)}
                  saving={updateRegisterMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kasse löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.display_label} wird unwiderruflich entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteTarget &&
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                })
              }
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht…
                </>
              ) : (
                'Löschen'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
