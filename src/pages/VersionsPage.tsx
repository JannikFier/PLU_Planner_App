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
import { useObstOfferCampaignsAdminList, useDeleteObstOfferCampaign } from '@/hooks/useCentralOfferCampaigns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { formatKWLabel } from '@/lib/plu-helpers'
import {
  CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE,
  centralOfferAdminDeleteDialogDescription,
} from '@/lib/central-offer-admin-copy'

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
                            onClick={() => navigate(`/super-admin/masterlist/version/${version.id}`)}
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

        <ObstCampaignsCard />

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

/**
 * Karte "Alle Werbungen" – pro KW je eine Zeile mit Buttons fuer Wochenwerbung
 * und 3-Tagespreis. Fuehrt auf die Edit-Seite der jeweiligen Kampagne.
 */
function ObstCampaignsCard() {
  const navigate = useNavigate()
  const { data: campaigns = [], isLoading } = useObstOfferCampaignsAdminList()
  const deleteObstCampaign = useDeleteObstOfferCampaign()
  const [campaignToDelete, setCampaignToDelete] = useState<{
    kw: number
    jahr: number
    campaignKind: 'ordersatz_week' | 'ordersatz_3day'
    label: string
  } | null>(null)

  const handleDeleteCampaignConfirm = async () => {
    if (!campaignToDelete) return
    try {
      await deleteObstCampaign.mutateAsync({
        kwNummer: campaignToDelete.kw,
        jahr: campaignToDelete.jahr,
        campaignKind: campaignToDelete.campaignKind,
      })
      setCampaignToDelete(null)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  type Row = {
    key: string
    kw: number
    jahr: number
    week?: { assigned: number; total: number; updated: string }
    threeDay?: { assigned: number; total: number; updated: string }
  }

  const rowsMap = new Map<string, Row>()
  for (const c of campaigns) {
    const k = `${c.jahr}-${c.kw_nummer}`
    if (!rowsMap.has(k)) {
      rowsMap.set(k, { key: k, kw: c.kw_nummer, jahr: c.jahr })
    }
    const r = rowsMap.get(k)!
    if (c.campaign_kind === 'ordersatz_week') {
      r.week = { assigned: c.assigned_lines, total: c.total_lines, updated: c.created_at }
    } else if (c.campaign_kind === 'ordersatz_3day') {
      r.threeDay = { assigned: c.assigned_lines, total: c.total_lines, updated: c.created_at }
    }
  }
  const rows = Array.from(rowsMap.values()).sort(
    (a, b) => (b.jahr - a.jahr) || (b.kw - a.kw),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alle Werbungen</CardTitle>
        <CardDescription>
          Zentral hochgeladene Werbungen pro Kalenderwoche. PLUs korrigieren, „keine Zuordnung“ setzen oder ergänzen;
          vorhandene Werbung kannst du hier auch vollständig löschen (Marktlisten und PDFs ohne diese Markierung).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine zentrale Werbung hochgeladen. Lade eine Excel-Datei über „Zentrale Obst- &amp; Gemüse-Werbung" hoch.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KW</TableHead>
                <TableHead>Wochenwerbung</TableHead>
                <TableHead>3-Tagespreis</TableHead>
                <TableHead>Zuletzt aktualisiert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const latest = [r.week?.updated, r.threeDay?.updated]
                  .filter(Boolean)
                  .sort()
                  .reverse()[0]
                return (
                  <TableRow key={r.key}>
                    <TableCell className="font-medium">{formatKWLabel(r.kw, r.jahr)}</TableCell>
                    <TableCell>
                      {r.week ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/super-admin/versions/werbung/obst/${r.kw}/${r.jahr}/wochenwerbung`,
                              )
                            }
                          >
                            {r.week.assigned} Artikel ansehen
                            {r.week.total > r.week.assigned
                              ? ` (+${r.week.total - r.week.assigned} offen)`
                              : ''}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Wochenwerbung löschen"
                            aria-label="Wochenwerbung löschen"
                            disabled={deleteObstCampaign.isPending}
                            onClick={() =>
                              setCampaignToDelete({
                                kw: r.kw,
                                jahr: r.jahr,
                                campaignKind: 'ordersatz_week',
                                label: `Wochenwerbung ${formatKWLabel(r.kw, r.jahr)}`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">nicht hochgeladen</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.threeDay ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(
                                `/super-admin/versions/werbung/obst/${r.kw}/${r.jahr}/dreitagespreis`,
                              )
                            }
                          >
                            {r.threeDay.assigned} Artikel ansehen
                            {r.threeDay.total > r.threeDay.assigned
                              ? ` (+${r.threeDay.total - r.threeDay.assigned} offen)`
                              : ''}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="3-Tagespreis löschen"
                            aria-label="3-Tagespreis löschen"
                            disabled={deleteObstCampaign.isPending}
                            onClick={() =>
                              setCampaignToDelete({
                                kw: r.kw,
                                jahr: r.jahr,
                                campaignKind: 'ordersatz_3day',
                                label: `3-Tagespreis ${formatKWLabel(r.kw, r.jahr)}`,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">nicht hochgeladen</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {latest ? formatDate(latest) : '–'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <AlertDialog
          open={!!campaignToDelete}
          onOpenChange={(open) => !open && setCampaignToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE}</AlertDialogTitle>
              <AlertDialogDescription>
                {campaignToDelete
                  ? centralOfferAdminDeleteDialogDescription(campaignToDelete.label)
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCampaignConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
