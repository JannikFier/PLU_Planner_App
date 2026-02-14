// VersionsPage: KW-Versionen verwalten

import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Eye, Trash2, Loader2 } from 'lucide-react'

import { useVersions } from '@/hooks/useVersions'
import { supabase } from '@/lib/supabase'

/** Hook: Version löschen (nur draft/frozen) */
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

  const handleDelete = async (id: string, kwLabel: string) => {
    if (!confirm(`Version ${kwLabel} wirklich löschen? Alle zugehörigen PLU-Daten werden entfernt.`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success(`Version ${kwLabel} gelöscht`)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Versionen</h2>
            <p className="text-sm text-muted-foreground">
              KW-Versionen verwalten und ansehen.
            </p>
          </div>
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
                            onClick={() => navigate('/super-admin/masterlist')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {version.status !== 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Löschen"
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(version.id, version.kw_label)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
