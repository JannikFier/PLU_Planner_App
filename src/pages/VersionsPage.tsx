// VersionsPage: KW-Versionen verwalten

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Eye, Trash2, Loader2 } from 'lucide-react'

import { useVersions } from '@/hooks/useVersions'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

/** Hook: Version löschen (inkl. aktive – dann wird die nächste zur aktiven) */
function useDeleteVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('versions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions'] })
      queryClient.invalidateQueries({ queryKey: ['version', 'active'] })
    },
  })
}

/** Status-Badge */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Aktiv</Badge>
    case 'draft':
      return <Badge variant="secondary">Entwurf</Badge>
    case 'frozen':
      return <Badge variant="outline">Archiv</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

/** Datum formatieren */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function VersionsPage() {
  const navigate = useNavigate()
  const { data: versions = [], isLoading } = useVersions()
  const deleteMutation = useDeleteVersion()
  const [versionToDelete, setVersionToDelete] = useState<{ id: string; kwLabel: string } | null>(null)

  const handleDeleteClick = (id: string, kwLabel: string) => {
    setVersionToDelete({ id, kwLabel })
  }

  const handleDeleteConfirm = async () => {
    if (!versionToDelete) return
    try {
      const isActive = versions.some((v) => v.id === versionToDelete.id && v.status === 'active')
      if (isActive) {
        const rest = versions.filter((v) => v.id !== versionToDelete.id)
        if (rest.length > 0) {
          const nextVersion = rest[0]
          const updatePayload: Database['public']['Tables']['versions']['Update'] = {
            status: 'active',
            published_at: new Date().toISOString(),
          }
          const { error: updateError } = await supabase
            .from('versions')
            .update(updatePayload as never)
            .eq('id', nextVersion.id)
          if (updateError) throw updateError
        }
      }
      await deleteMutation.mutateAsync(versionToDelete.id)
      setVersionToDelete(null)
      toast.success(`Version ${versionToDelete.kwLabel} gelöscht`)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Versionen</h2>
            <p className="text-sm text-muted-foreground">
              KW-Versionen verwalten und ansehen.
            </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Versionen</CardTitle>
            <CardDescription>
              Jede Kalenderwoche hat eine eigene Version. Die aktive Version wird allen Usern angezeigt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden...
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Versionen vorhanden. Lade eine Excel-Datei hoch, um die erste Version zu erstellen.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Veröffentlicht</TableHead>
                    <TableHead>Löschdatum</TableHead>
                    <TableHead className="w-[100px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow
                      key={version.id}
                      className={version.status === 'active' ? 'bg-primary/5' : ''}
                    >
                      <TableCell className="font-medium">{version.kw_label}</TableCell>
                      <TableCell><StatusBadge status={version.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(version.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(version.published_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {version.delete_after ? formatDate(version.delete_after) : '–'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ansehen"
                            aria-label="Ansehen"
                            onClick={() => navigate('/super-admin/masterlist')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Löschen"
                            aria-label="Löschen"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDeleteClick(version.id, version.kw_label)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!versionToDelete} onOpenChange={(open) => !open && setVersionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Version löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Version {versionToDelete?.kwLabel} wirklich löschen? Alle zugehörigen PLU-Daten werden entfernt.
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
