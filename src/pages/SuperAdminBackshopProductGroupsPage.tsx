// Super-Admin: Produktgruppen-Review.
// Zeigt automatisch erzeugte und manuelle Produktgruppen an.
// Erlaubt Member entfernen, Gruppe löschen und Review-Flag umzuschalten.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Trash2, CheckCircle2, Image as ImageIcon, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import type { BackshopProductGroupMember } from '@/types/database'
import { formatError } from '@/lib/error-messages'
type FilterMode = 'all' | 'auto' | 'manual' | 'review'

export function SuperAdminBackshopProductGroupsPage() {
  const navigate = useNavigate()
  const { data: groups = [], isLoading, error } = useBackshopProductGroups()
  const { data: activeVersion } = useActiveBackshopVersion()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups
      .filter((g) => {
        if (filter === 'auto' && g.origin !== 'auto') return false
        if (filter === 'manual' && g.origin !== 'manual') return false
        if (filter === 'review' && !g.needs_review) return false
        if (!q) return true
        const inName = g.display_name.toLowerCase().includes(q)
        const inMembers = g.resolvedItems.some(
          (it) => it.system_name.toLowerCase().includes(q) || it.plu.includes(q)
        )
        return inName || inMembers
      })
  }, [groups, search, filter])

  const removeMember = useMutation({
    mutationFn: async ({ groupId, plu, source }: { groupId: string; plu: string; source: BackshopProductGroupMember['source'] }) => {
      const { error: e } = await supabase
        .from('backshop_product_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('plu', plu)
        .eq('source', source)
      if (e) throw e
    },
    onSuccess: () => {
      toast.success('Mitglied entfernt')
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error: e } = await supabase.from('backshop_product_groups').delete().eq('id', groupId)
      if (e) throw e
    },
    onSuccess: () => {
      toast.success('Gruppe gelöscht')
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })

  const toggleReview = useMutation({
    mutationFn: async ({ groupId, value }: { groupId: string; value: boolean }) => {
      const { error: e } = await supabase
        .from('backshop_product_groups')
        .update({ needs_review: value } as never)
        .eq('id', groupId)
      if (e) throw e
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] }),
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })

  const renameGroup = useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const { error: e } = await supabase
        .from('backshop_product_groups')
        .update({ display_name: name } as never)
        .eq('id', groupId)
      if (e) throw e
    },
    onSuccess: () => {
      toast.success('Name aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produktgruppen (Backshop)</h2>
          <p className="text-muted-foreground text-sm">
            Beim Upload werden Artikel mit gleichem Namen aus unterschiedlichen Quellen automatisch zu Gruppen verbunden. Neue manuelle Gruppen legst du im Kachel-Editor an; über „Mitglied“ öffnest du denselben Editor mit vorausgewählten Artikeln und kannst weitere hinzufügen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => navigate('/super-admin/backshop-product-groups/neu')}
            disabled={!activeVersion}
          >
            <Plus className="h-4 w-4 mr-1" />
            Neue Gruppe (manuell)
          </Button>
          {!activeVersion && (
            <span className="text-xs text-muted-foreground self-center">Aktive Backshop-Version nötig für manuelle Member.</span>
          )}
        </div>

        <Card>
          <CardContent className="py-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Suchen (Name oder PLU)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center gap-1 text-xs">
              {(['all', 'auto', 'manual', 'review'] as FilterMode[]).map((m) => (
                <Button
                  key={m}
                  variant={filter === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(m)}
                >
                  {m === 'all' ? 'Alle' : m === 'auto' ? 'Auto' : m === 'manual' ? 'Manuell' : 'Zu prüfen'}
                </Button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} von {groups.length} Gruppen
            </span>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4 text-sm text-destructive">Fehler beim Laden: {formatError(error)}</CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filtered.map((g) => (
            <Card key={g.id} className={g.needs_review ? 'border-amber-300' : ''}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">
                      <input
                        defaultValue={g.display_name}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v && v !== g.display_name) renameGroup.mutate({ groupId: g.id, name: v })
                        }}
                        className="bg-transparent border-b border-dashed border-muted-foreground/30 focus:outline-none focus:border-primary px-0.5"
                      />
                    </CardTitle>
                    <Badge variant={g.origin === 'manual' ? 'default' : 'secondary'} className="text-xs">
                      {g.origin === 'manual' ? 'Manuell' : 'Automatisch'}
                    </Badge>
                    {g.needs_review && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                        <AlertCircle className="h-3 w-3 mr-1" /> Zu prüfen
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{g.members.length} Mitglied(er)</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!activeVersion}
                      onClick={() => {
                        navigate(`/super-admin/backshop-product-groups/neu?group=${encodeURIComponent(g.id)}`)
                      }}
                      title="Kachel-Editor mit bestehenden Mitgliedern öffnen"
                    >
                      <Plus className="h-4 w-4 mr-0.5" />
                      Mitglied
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleReview.mutate({ groupId: g.id, value: !g.needs_review })}
                      title="Review-Flag umschalten"
                    >
                      {g.needs_review ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Gruppe "${g.display_name}" wirklich löschen?`)) {
                          deleteGroup.mutate(g.id)
                        }
                      }}
                      className="text-destructive hover:bg-destructive/10"
                      title="Gruppe löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {g.resolvedItems.map((it) => {
                    const meta = BACKSHOP_SOURCE_META[it.source]
                    return (
                      <div
                        key={`${it.plu}-${it.source}`}
                        className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
                      >
                        {it.image_url ? (
                          <img src={it.image_url} alt="" className="h-12 w-12 rounded object-contain bg-background border" />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center border">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                              title={meta.label}
                            >
                              {meta.short}
                            </span>
                            <span className="font-mono text-xs">{it.plu}</span>
                          </div>
                          <p className="text-sm truncate" title={it.display_name ?? it.system_name}>
                            {it.display_name ?? it.system_name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeMember.mutate({ groupId: g.id, plu: it.plu, source: it.source })}
                          title="Aus Gruppe entfernen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && filtered.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Keine Gruppen gefunden. Lade Uploads aus mehreren Quellen hoch, damit Gruppen automatisch entstehen.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
