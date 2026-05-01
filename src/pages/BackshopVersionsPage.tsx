// BackshopVersionsPage: Backshop-KW-Versionen verwalten

import { Fragment, useState, useMemo } from 'react'
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
import { Eye, Trash2, Loader2, ChevronRight, ChevronDown } from 'lucide-react'

import { useBackshopVersions } from '@/hooks/useBackshopVersions'
import {
  useBackshopOfferCampaignsAdminList,
  useDeleteBackshopOfferCampaign,
} from '@/hooks/useCentralOfferCampaigns'
import {
  CENTRAL_OFFER_ADMIN_DELETE_DIALOG_TITLE,
  centralOfferAdminDeleteDialogDescription,
} from '@/lib/central-offer-admin-copy'
import {
  useBackshopVersionSourcePublish,
  indexBackshopSourcePublishByVersionAndSource,
} from '@/hooks/useBackshopVersionSourcePublish'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { formatKWLabel } from '@/lib/plu-helpers'
import {
  BACKSHOP_SOURCES,
  BACKSHOP_SOURCE_META,
  type BackshopExcelSource,
} from '@/lib/backshop-sources'
import { cn } from '@/lib/utils'

/** Zeilen-Hintergrund + linker Streifen passend zu Edeka / Harry / Aryzta (siehe BACKSHOP_SOURCE_META). */
const BACKSHOP_SOURCE_SUBROW_ROW: Record<BackshopExcelSource, string> = {
  edeka: 'border-l-[4px] border-l-blue-500 bg-blue-50/90 hover:bg-blue-100/90 dark:bg-blue-950/35 dark:hover:bg-blue-950/50',
  harry: 'border-l-[4px] border-l-orange-500 bg-orange-50/90 hover:bg-orange-100/90 dark:bg-orange-950/35 dark:hover:bg-orange-950/50',
  aryzta: 'border-l-[4px] border-l-violet-500 bg-violet-50/90 hover:bg-violet-100/90 dark:bg-violet-950/35 dark:hover:bg-violet-950/50',
}

/** Hook: Backshop-Version löschen (bei aktiver Version ggf. nächste aktivieren) */
function useDeleteBackshopVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backshop_versions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version-source-publish'] })
    },
  })
}

function useDeleteBackshopSourcePayload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ versionId, source }: { versionId: string; source: BackshopExcelSource }) => {
      const { error } = await supabase.rpc('delete_backshop_master_items_by_source', {
        p_version_id: versionId,
        p_source: source,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-version-source-publish'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-plu-items'] })
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
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

export function BackshopVersionsPage() {
  const navigate = useNavigate()
  const { data: versions = [], isLoading } = useBackshopVersions()
  const versionIds = useMemo(() => versions.map((v) => v.id), [versions])
  const { data: publishRows = [] } = useBackshopVersionSourcePublish(versionIds)
  const publishIndex = useMemo(() => indexBackshopSourcePublishByVersionAndSource(publishRows), [publishRows])

  const deleteMutation = useDeleteBackshopVersion()
  const deleteSourceMutation = useDeleteBackshopSourcePayload()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [versionToDelete, setVersionToDelete] = useState<{ id: string; kwLabel: string } | null>(null)
  const [sourceToDelete, setSourceToDelete] = useState<{
    versionId: string
    kwLabel: string
    source: BackshopExcelSource
    label: string
  } | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteClick = (id: string, kwLabel: string) => {
    setVersionToDelete({ id, kwLabel })
  }

  const handleDeleteConfirm = async () => {
    if (!versionToDelete) return
    const kwLabel = versionToDelete.kwLabel
    try {
      const isActive = versions.some((v) => v.id === versionToDelete.id && v.status === 'active')
      if (isActive) {
        const rest = versions.filter((v) => v.id !== versionToDelete.id)
        if (rest.length > 0) {
          const nextVersion = rest[0]
          const updatePayload: Database['public']['Tables']['backshop_versions']['Update'] = {
            status: 'active',
            published_at: new Date().toISOString(),
          }
          const { error: updateError } = await supabase
            .from('backshop_versions')
            .update(updatePayload as never)
            .eq('id', nextVersion.id)
          if (updateError) throw updateError
        }
      }
      await deleteMutation.mutateAsync(versionToDelete.id)
      setVersionToDelete(null)
      toast.success(`Backshop-Version ${kwLabel} gelöscht`)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  const handleDeleteSourceConfirm = async () => {
    if (!sourceToDelete) return
    const { versionId, source, kwLabel, label } = sourceToDelete
    try {
      await deleteSourceMutation.mutateAsync({ versionId, source })
      setSourceToDelete(null)
      toast.success(`${label} in ${kwLabel} entfernt`)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Backshop-Versionen</h2>
          <p className="text-sm text-muted-foreground">
            KW-Versionen der Backshop-Liste verwalten und ansehen. Pro KW kannst du die drei
            Marken-Uploads (Edeka, Harry, Aryzta) aufklappen – es gilt jeweils der letzte erfolgreiche
            Publish pro Marke.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alle Backshop-Versionen</CardTitle>
            <CardDescription>
              Jede Kalenderwoche hat eine gemeinsame Version; Unterzeilen zeigen den letzten Stand pro
              Quelle. Die aktive Version wird allen Nutzern angezeigt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Laden...
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Noch keine Backshop-Versionen vorhanden. Nutze „Backshop Upload“, um die erste Version zu
                erstellen.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" aria-hidden />
                    <TableHead>KW</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Veröffentlicht</TableHead>
                    <TableHead>Löschdatum</TableHead>
                    <TableHead className="w-[100px]">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => {
                    const expanded = expandedIds.has(version.id)
                    return (
                      <Fragment key={version.id}>
                        <TableRow className={version.status === 'active' ? 'bg-primary/5' : ''}>
                          <TableCell className="align-middle p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Quellen einklappen' : 'Quellen aufklappen'}
                              onClick={() => toggleExpand(version.id)}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">{version.kw_label}</TableCell>
                          <TableCell>
                            <StatusBadge status={version.status} />
                          </TableCell>
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
                                title="Gesamte KW ansehen"
                                aria-label="Gesamte KW ansehen"
                                onClick={() =>
                                  navigate(`/super-admin/backshop-list/version/${version.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="KW löschen"
                                aria-label="KW löschen"
                                disabled={deleteMutation.isPending}
                                onClick={() => handleDeleteClick(version.id, version.kw_label)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded &&
                          BACKSHOP_SOURCES.map((src) => {
                            const publishRow = publishIndex.get(`${version.id}|${src}`)
                            const sourceMeta = BACKSHOP_SOURCE_META[src]
                            const label = sourceMeta.label
                            const hasData = !!publishRow && publishRow.row_count > 0
                            return (
                              <TableRow
                                key={`${version.id}-${src}`}
                                className={cn('transition-colors', BACKSHOP_SOURCE_SUBROW_ROW[src])}
                              >
                                <TableCell />
                                <TableCell className="pl-4">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-medium',
                                      sourceMeta.bgClass,
                                      sourceMeta.textClass,
                                      sourceMeta.borderClass,
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold leading-none',
                                        sourceMeta.bgClass,
                                        sourceMeta.textClass,
                                        'ring-1 ring-inset',
                                        sourceMeta.borderClass,
                                      )}
                                      aria-hidden
                                    >
                                      {sourceMeta.short}
                                    </span>
                                    {label}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">–</TableCell>
                                <TableCell className="text-sm text-muted-foreground">–</TableCell>
                                <TableCell
                                  className={cn('text-sm', hasData ? sourceMeta.textClass : 'text-muted-foreground')}
                                >
                                  {hasData ? (
                                    <>
                                      {formatDate(publishRow.published_at)}
                                      <span className="ml-2 text-xs opacity-90">
                                        ({publishRow.row_count} PLUs)
                                      </span>
                                    </>
                                  ) : (
                                    <span className="italic">Kein Upload</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">–</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title={`${label} ansehen`}
                                      aria-label={`${label} ansehen`}
                                      className="text-muted-foreground hover:bg-muted/80"
                                      onClick={() =>
                                        navigate(
                                          `/super-admin/backshop-list/version/${version.id}?source=${src}`,
                                        )
                                      }
                                    >
                                      <Eye className={cn('h-4 w-4', sourceMeta.textClass)} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title={`${label} in dieser KW entfernen`}
                                      aria-label={`${label} entfernen`}
                                      disabled={deleteSourceMutation.isPending || !hasData}
                                      onClick={() =>
                                        setSourceToDelete({
                                          versionId: version.id,
                                          kwLabel: version.kw_label,
                                          source: src,
                                          label,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <BackshopCampaignsCard />

        <AlertDialog open={!!versionToDelete} onOpenChange={(open) => !open && setVersionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Backshop-Version löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Version {versionToDelete?.kwLabel} wirklich löschen? Alle zugehörigen Backshop-PLU-Daten
                werden entfernt.
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

        <AlertDialog open={!!sourceToDelete} onOpenChange={(open) => !open && setSourceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quelle in dieser KW entfernen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle Master-PLUs von „{sourceToDelete?.label}“ in {sourceToDelete?.kwLabel} werden gelöscht
                (inkl. Produktgruppen-Verknüpfungen dieser PLUs). Andere Marken in derselben KW bleiben
                erhalten.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSourceConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Entfernen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  )
}

/**
 * Karte "Alle Werbungen" fuer den Backshop. Pro KW genau eine Werbung
 * (kein 3-Tagespreis); Klick fuehrt auf die Edit-Seite.
 */
function BackshopCampaignsCard() {
  const navigate = useNavigate()
  const { data: campaigns = [], isLoading } = useBackshopOfferCampaignsAdminList()
  const deleteBackshopCampaign = useDeleteBackshopOfferCampaign()
  const [campaignToDelete, setCampaignToDelete] = useState<{
    kw: number
    jahr: number
    label: string
  } | null>(null)

  const handleDeleteCampaignConfirm = async () => {
    if (!campaignToDelete) return
    try {
      await deleteBackshopCampaign.mutateAsync({
        kwNummer: campaignToDelete.kw,
        jahr: campaignToDelete.jahr,
      })
      setCampaignToDelete(null)
    } catch (err) {
      toast.error(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alle Werbungen</CardTitle>
        <CardDescription>
          Zentral hochgeladene Backshop-Werbungen pro Kalenderwoche. PLUs korrigieren, „keine Zuordnung“
          setzen oder ergänzen; vorhandene Werbung kannst du hier auch vollständig löschen (Marktlisten und
          PDFs ohne diese Markierung).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Laden…
          </div>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine zentrale Werbung hochgeladen. Lade eine Exit-Excel über „Zentrale Werbung
            (Backshop)" hoch.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KW</TableHead>
                <TableHead>Wochenwerbung</TableHead>
                <TableHead>Zuletzt aktualisiert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{formatKWLabel(c.kw_nummer, c.jahr)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/super-admin/backshop-versions/werbung/${c.kw_nummer}/${c.jahr}`)
                        }
                      >
                        {c.assigned_lines} Artikel ansehen
                        {c.total_lines > c.assigned_lines
                          ? ` (+${c.total_lines - c.assigned_lines} offen)`
                          : ''}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Wochenwerbung löschen"
                        aria-label="Wochenwerbung löschen"
                        disabled={deleteBackshopCampaign.isPending}
                        onClick={() =>
                          setCampaignToDelete({
                            kw: c.kw_nummer,
                            jahr: c.jahr,
                            label: `Backshop-Wochenwerbung ${formatKWLabel(c.kw_nummer, c.jahr)}`,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
                  </TableCell>
              </TableRow>
              ))}
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
