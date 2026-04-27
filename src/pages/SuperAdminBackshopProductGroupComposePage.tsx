// Super-Admin: Neue manuelle Produktgruppe per Kachel-Editor (Warengruppe → Artikel → Staging).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Image as ImageIcon, Loader2, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import { BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import { useActiveBackshopVersion } from '@/hooks/useActiveBackshopVersion'
import { useBackshopPLUData } from '@/hooks/useBackshopPLUData'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import {
  useApplyBackshopProductGroupMembers,
  useCreateManualBackshopProductGroup,
} from '@/hooks/useBackshopProductGroupAdminMutations'
import {
  buildMemberToGroupMap,
  classifyMemberKeysForApply,
  isMemberPickerSelectableSource,
  memberPickerKey,
  type MemberPickerGroupLite,
} from '@/lib/backshop-product-group-member-picker'
import type { BackshopMasterPLUItem } from '@/types/database'
import { cn } from '@/lib/utils'
import { formatError } from '@/lib/error-messages'
import { supabase } from '@/lib/supabase'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useStoreBackshopNameBlockOverrides } from '@/hooks/useStoreBackshopBlockLayout'
import { buildNameBlockOverrideMap, effectiveBlockIdForStoreOverride } from '@/lib/block-override-utils'

const UNASSIGNED = '__unassigned__' as const

type GridScope = 'all' | 'unmatched'

function pickLabel(item: BackshopMasterPLUItem): string {
  return (item.display_name?.trim() || item.system_name?.trim() || item.plu) as string
}

function memberStatus(
  key: string,
  memberToGroup: Map<string, { groupId: string; displayName: string }>,
  editingGroupId: string | null,
): 'free' | 'in_other' {
  const hit = memberToGroup.get(key)
  if (!hit) return 'free'
  if (editingGroupId && hit.groupId === editingGroupId) return 'free'
  return 'in_other'
}

export function SuperAdminBackshopProductGroupComposePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const editGroupId = searchParams.get('group')
  const { data: activeVersion } = useActiveBackshopVersion()
  const { data: masterItems = [], isLoading: itemsLoading } = useBackshopPLUData(activeVersion?.id, {
    enabled: !!activeVersion?.id,
  })
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: groups = [], isLoading: groupsLoading } = useBackshopProductGroups()
  const editGroup = editGroupId ? groups.find((g) => g.id === editGroupId) : undefined
  const isEditMode = Boolean(editGroupId && editGroup)
  const invalidEditGroup = Boolean(editGroupId && !groupsLoading && !editGroup)

  const initialStagingKeysRef = useRef<Set<string>>(new Set())
  const lastSeededEditIdRef = useRef<string | null>(null)

  const [sidebarBlock, setSidebarBlock] = useState<string | typeof UNASSIGNED>(UNASSIGNED)
  const [gridScope, setGridScope] = useState<GridScope>('all')
  const [gridSearch, setGridSearch] = useState('')
  const deferredSearch = useDebouncedValue(gridSearch, 200)
  const [stagingKeys, setStagingKeys] = useState<Set<string>>(() => new Set())
  const [displayName, setDisplayName] = useState('')
  const [groupBlockId, setGroupBlockId] = useState<string>('')
  const displayNameEditedRef = useRef(false)
  const prevStagingCountRef = useRef(0)

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  )

  const { currentStoreId } = useCurrentStore()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrideMap = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )
  const effBlockId = useCallback(
    (it: BackshopMasterPLUItem) =>
      effectiveBlockIdForStoreOverride(it.system_name, it.block_id, nameBlockOverrideMap),
    [nameBlockOverrideMap],
  )

  const groupsLite: MemberPickerGroupLite[] = useMemo(
    () =>
      groups.map((g) => ({
        id: g.id,
        display_name: g.display_name,
        members: g.members.map((m) => ({ plu: m.plu, source: m.source })),
      })),
    [groups],
  )

  const memberToGroup = useMemo(() => buildMemberToGroupMap(groupsLite), [groupsLite])

  const pickableItems = useMemo(
    () => masterItems.filter((i) => isMemberPickerSelectableSource(i.source ?? 'edeka')),
    [masterItems],
  )

  const itemsInSidebar = useMemo(() => {
    return pickableItems.filter((it) => {
      const eff = effBlockId(it)
      if (sidebarBlock === UNASSIGNED) return eff == null
      return eff === sidebarBlock
    })
  }, [pickableItems, sidebarBlock, effBlockId])

  const itemsAfterSearch = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    if (!q) return itemsInSidebar
    return itemsInSidebar.filter((it) => {
      const label = pickLabel(it).toLowerCase()
      return label.includes(q) || it.plu.includes(q)
    })
  }, [itemsInSidebar, deferredSearch])

  const visibleGridItems = useMemo(() => {
    if (gridScope !== 'unmatched') return itemsAfterSearch
    return itemsAfterSearch.filter((it) => {
      const key = memberPickerKey(it.plu, it.source ?? 'edeka')
      return memberStatus(key, memberToGroup, editGroupId) === 'free'
    })
  }, [itemsAfterSearch, gridScope, memberToGroup, editGroupId])

  const countsByBlock = useMemo(() => {
    const m = new Map<string | null, number>()
    for (const it of pickableItems) {
      const k = effBlockId(it) ?? null
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [pickableItems, effBlockId])

  const stagingItems = useMemo(() => {
    const list: BackshopMasterPLUItem[] = []
    for (const it of pickableItems) {
      const src = it.source ?? 'edeka'
      const key = memberPickerKey(it.plu, src)
      if (stagingKeys.has(key)) list.push(it)
    }
    return list.sort((a, b) => pickLabel(a).localeCompare(pickLabel(b), 'de'))
  }, [pickableItems, stagingKeys])

  /* Zusammengehörige Form-Syncs: Sidebar, Staging, Bearbeiten/Neu – External Sync */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (sidebarBlock === UNASSIGNED) {
      setGroupBlockId('')
    } else {
      setGroupBlockId(sidebarBlock)
    }
  }, [sidebarBlock])

  useEffect(() => {
    const size = stagingKeys.size
    if (size === 0) {
      displayNameEditedRef.current = false
      prevStagingCountRef.current = 0
      return
    }
    if (size === 1 && prevStagingCountRef.current === 0 && stagingItems[0] && !displayNameEditedRef.current) {
      setDisplayName(pickLabel(stagingItems[0]))
    }
    prevStagingCountRef.current = size
  }, [stagingKeys.size, stagingItems])

  /** Bearbeitungsmodus: Formular aus bestehender Gruppe vorbelegen. */
  useEffect(() => {
    if (!editGroupId || !editGroup) return
    if (lastSeededEditIdRef.current === editGroupId) return
    lastSeededEditIdRef.current = editGroupId

    const keys = new Set(editGroup.members.map((m) => memberPickerKey(m.plu, m.source)))
    setStagingKeys(keys)
    initialStagingKeysRef.current = new Set(keys)
    setDisplayName(editGroup.display_name)
    const bi = editGroup.block_id
    setGroupBlockId(bi ?? '')
    setSidebarBlock(bi ?? UNASSIGNED)
    displayNameEditedRef.current = true
    prevStagingCountRef.current = keys.size
  }, [editGroupId, editGroup])

  /** Von `?group=` zurück auf „neu“: Formular leeren. */
  useEffect(() => {
    if (editGroupId) return
    if (lastSeededEditIdRef.current === null) return
    lastSeededEditIdRef.current = null
    setStagingKeys(new Set())
    initialStagingKeysRef.current = new Set()
    setDisplayName('')
    setGroupBlockId('')
    setSidebarBlock(UNASSIGNED)
    displayNameEditedRef.current = false
    prevStagingCountRef.current = 0
  }, [editGroupId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTile = useCallback(
    (item: BackshopMasterPLUItem) => {
      const src = item.source ?? 'edeka'
      const key = memberPickerKey(item.plu, src)
      const status = memberStatus(key, memberToGroup, editGroupId)
      setStagingKeys((prev) => {
        if (prev.has(key)) {
          const next = new Set(prev)
          next.delete(key)
          return next
        }
        if (status === 'in_other') {
          queueMicrotask(() =>
            toast.message('Bereits einer anderen Produktgruppe zugeordnet', {
              description: 'In der Produktgruppen-Übersicht zuerst aus der anderen Gruppe entfernen.',
            }),
          )
          return prev
        }
        const next = new Set(prev)
        next.add(key)
        return next
      })
    },
    [memberToGroup, editGroupId],
  )

  const removeFromStaging = useCallback((item: BackshopMasterPLUItem) => {
    setStagingKeys((prev) => {
      const key = memberPickerKey(item.plu, item.source ?? 'edeka')
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const createGroup = useCreateManualBackshopProductGroup()
  const applyMembers = useApplyBackshopProductGroupMembers()

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = displayName.trim()
      if (!name) throw new Error('Anzeigename fehlt')
      if (stagingKeys.size === 0) throw new Error('Mindestens ein Artikel auswählen')
      const blockId = groupBlockId && groupBlockId !== '__none__' ? groupBlockId : null

      if (editGroupId && editGroup) {
        const { error: updErr } = await supabase
          .from('backshop_product_groups')
          .update({ display_name: name, block_id: blockId } as never)
          .eq('id', editGroupId)
        if (updErr) throw updErr

        const initial = initialStagingKeysRef.current
        const current = stagingKeys
        for (const key of initial) {
          if (current.has(key)) continue
          const pipe = key.indexOf('|')
          if (pipe < 0) continue
          const plu = key.slice(0, pipe)
          const source = key.slice(pipe + 1)
          const { error: delErr } = await supabase
            .from('backshop_product_group_members')
            .delete()
            .eq('group_id', editGroupId)
            .eq('plu', plu)
            .eq('source', source)
          if (delErr) throw delErr
        }

        const toAddKeys = [...current].filter((k) => !initial.has(k))
        if (toAddKeys.length > 0) {
          const { toApply } = classifyMemberKeysForApply(toAddKeys, editGroupId, memberToGroup)
          if (toApply.length > 0) {
            await applyMembers.mutateAsync({ groupId: editGroupId, items: toApply })
          }
        }
        return { kind: 'edit' as const }
      }

      const groupId = await createGroup.mutateAsync({ displayName: name, blockId })
      const { toApply } = classifyMemberKeysForApply([...stagingKeys], groupId, memberToGroup)
      if (toApply.length > 0) {
        await applyMembers.mutateAsync({ groupId, items: toApply })
      }
      return { kind: 'create' as const }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
      if (result.kind === 'edit') {
        navigate('/super-admin/backshop-product-groups')
        return
      }
      setStagingKeys(new Set())
      initialStagingKeysRef.current = new Set()
      setDisplayName('')
      displayNameEditedRef.current = false
      prevStagingCountRef.current = 0
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })

  const handleCancel = () => {
    if (stagingKeys.size > 0 || displayName.trim()) {
      if (!confirm('Änderungen verwerfen und zur Übersicht zurück?')) return
    }
    navigate('/super-admin/backshop-product-groups')
  }

  const busy =
    saveMutation.isPending ||
    applyMembers.isPending ||
    (!isEditMode && createGroup.isPending)

  if (!activeVersion) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <p className="text-sm text-muted-foreground">Keine aktive Backshop-Version – Kachel-Editor ist nicht verfügbar.</p>
          <Button variant="outline" asChild>
            <Link to="/super-admin/backshop-product-groups">Zur Übersicht</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (invalidEditGroup) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-sm text-muted-foreground">Diese Produktgruppe wurde nicht gefunden oder existiert nicht mehr.</p>
          <Button variant="outline" asChild>
            <Link to="/super-admin/backshop-product-groups">Zur Übersicht</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-[min(100%,1680px)] mx-auto flex flex-col gap-3 h-[calc(100dvh-5.75rem)] min-h-[480px]">
        <div className="shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {isEditMode ? 'Mitglieder bearbeiten (Kachel-Editor)' : 'Neue Produktgruppe (Kachel-Editor)'}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-snug">
            {isEditMode
              ? 'Bestehende Mitglieder sind vorausgewählt; weitere Artikel per Kachel hinzufügen oder entfernen. Warengruppe der Gruppe folgt der linken Navigation.'
              : 'Warengruppe links wählen; in der Mitte nur im Kachel-Bereich scrollen. Rechts Name und Auswahl prüfen, Aktionen sind immer erreichbar. Warengruppe der Gruppe folgt der linken Navigation (zentrale Master-Zuordnung).'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 lg:items-stretch">
          {/* Links: Warengruppen */}
          <aside className="lg:col-span-3 flex flex-col rounded-lg border bg-card min-h-[200px] lg:min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium shrink-0">Warengruppen</div>
            {!currentStoreId ? (
              <p className="px-3 py-1.5 text-[11px] text-muted-foreground border-b bg-muted/15 leading-snug">
                Kein Markt gewählt — Zuordnung wie Master-Liste ohne Markt-Overrides (wie Warengruppen-Workbench
                ohne Marktkontext).
              </p>
            ) : null}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-1">
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setSidebarBlock(UNASSIGNED)}
                  className={cn(
                    'w-full text-left rounded-md px-3 py-2 text-sm transition-colors',
                    sidebarBlock === UNASSIGNED ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                >
                  Ohne Zuordnung
                  <span className="ml-1 text-xs opacity-80">({countsByBlock.get(null) ?? 0})</span>
                </button>
                {sortedBlocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSidebarBlock(b.id)}
                    className={cn(
                      'w-full text-left rounded-md px-3 py-2 text-sm transition-colors break-words',
                      sidebarBlock === b.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                    )}
                  >
                    {b.name}
                    <span className="ml-1 text-xs opacity-80">({countsByBlock.get(b.id) ?? 0})</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Mitte: nur dieser Bereich scrollt */}
          <section className="lg:col-span-6 flex flex-col rounded-lg border bg-card min-h-[240px] lg:min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-sm font-medium shrink-0">Artikel</span>
              <div className="flex items-center gap-1 text-xs">
                <Button
                  type="button"
                  variant={gridScope === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGridScope('all')}
                >
                  Alle
                </Button>
                <Button
                  type="button"
                  variant={gridScope === 'unmatched' ? 'default' : 'outline'}
                  size="sm"
                  title="Nur Artikel ohne fremde Produktgruppe (beim Bearbeiten: inkl. dieser Gruppe)"
                  onClick={() => setGridScope('unmatched')}
                >
                  Nur offen
                </Button>
              </div>
              <Input
                placeholder="Suche in dieser Warengruppe…"
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="h-8 max-w-xs w-full sm:w-auto sm:ml-auto sm:min-w-[12rem]"
              />
            </div>
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 touch-pan-y"
              data-testid="compose-tile-scroll"
            >
              {itemsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Laden…
                </div>
              ) : visibleGridItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {itemsInSidebar.length === 0
                    ? 'Keine Artikel in dieser Auswahl.'
                    : itemsAfterSearch.length === 0 && deferredSearch.trim()
                      ? 'Keine Treffer für die Suche.'
                      : gridScope === 'unmatched'
                        ? 'Keine offenen Artikel in dieser Warengruppe.'
                        : 'Keine Artikel in dieser Auswahl.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-w-4xl mx-auto">
                  {visibleGridItems.map((item) => {
                    const src = item.source ?? 'edeka'
                    const key = memberPickerKey(item.plu, src)
                    const inStaging = stagingKeys.has(key)
                    const st = memberStatus(key, memberToGroup, editGroupId)
                    const meta = BACKSHOP_SOURCE_META[src as keyof typeof BACKSHOP_SOURCE_META]
                    const otherName = st === 'in_other' ? memberToGroup.get(key)?.displayName : undefined
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTile(item)}
                        className={cn(
                          'rounded-lg border text-left overflow-hidden flex flex-col transition-colors max-h-[min(28vh,220px)]',
                          inStaging ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'bg-background hover:bg-muted/40',
                          st === 'in_other' && !inStaging ? 'opacity-60 cursor-not-allowed' : '',
                        )}
                      >
                        <div className="aspect-square max-h-[min(22vh,160px)] min-h-0 shrink-0 bg-muted/50 flex items-center justify-center border-b">
                          {item.image_url ? (
                            <BackshopThumbnail src={item.image_url} size="2xl" className="!h-full !w-full max-h-full" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-2 space-y-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            {meta && (
                              <span
                                className={cn(
                                  'inline-flex rounded px-1 py-0.5 text-[9px] font-semibold border',
                                  meta.bgClass,
                                  meta.textClass,
                                  meta.borderClass,
                                )}
                              >
                                {meta.short}
                              </span>
                            )}
                            <span className="font-mono text-[11px]">{item.plu}</span>
                          </div>
                          <p className="text-xs leading-snug line-clamp-3 break-words" title={pickLabel(item)}>
                            {pickLabel(item)}
                          </p>
                          {st === 'in_other' && (
                            <Badge variant="outline" className="text-[9px] max-w-full truncate" title={otherName}>
                              Gruppe: {otherName ?? '?'}
                            </Badge>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Rechts: Form fix, Staging scrollt, Buttons fix unten */}
          <aside className="lg:col-span-3 flex flex-col rounded-lg border bg-card min-h-[280px] lg:min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium shrink-0">
              {isEditMode ? 'Gruppe bearbeiten' : 'Neues Match'}
            </div>
            <div className="p-3 space-y-3 shrink-0 border-b bg-card">
              <div className="space-y-1.5">
                <Label htmlFor="compose-name">Anzeigename der Gruppe</Label>
                <Input
                  id="compose-name"
                  value={displayName}
                  onChange={(e) => {
                    displayNameEditedRef.current = true
                    setDisplayName(e.target.value)
                  }}
                  placeholder="Wird beim ersten Artikel vorbelegt"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Warengruppe der Produktgruppe</Label>
                <p className="text-xs text-muted-foreground">
                  Entspricht der links gewählten Warengruppe. Bei „Ohne Zuordnung“ keine Warengruppe für die Gruppe.
                </p>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {sidebarBlock === UNASSIGNED
                    ? '— keine —'
                    : sortedBlocks.find((b) => b.id === sidebarBlock)?.name ?? '—'}
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col px-3 pt-2 pb-1">
              <div className="text-xs font-medium text-muted-foreground mb-1 shrink-0">
                Auswahl ({stagingItems.length})
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 -mr-0.5">
                <ul className="space-y-1.5 pb-1">
                  {stagingItems.length === 0 ? (
                    <li className="text-xs text-muted-foreground">Tippe in der Mitte auf Kacheln.</li>
                  ) : (
                    stagingItems.map((item) => {
                      const src = item.source ?? 'edeka'
                      const meta = BACKSHOP_SOURCE_META[src as keyof typeof BACKSHOP_SOURCE_META]
                      return (
                        <li
                          key={memberPickerKey(item.plu, src)}
                          className="flex items-center gap-2 rounded-md border bg-muted/20 pl-2 pr-1 py-1.5 text-xs min-w-0"
                        >
                          <BackshopThumbnail src={item.image_url} size="md" className="rounded shrink-0" />
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center gap-1 flex-wrap">
                              {meta && (
                                <span
                                  className={cn(
                                    'rounded px-1 text-[9px] font-semibold border shrink-0',
                                    meta.bgClass,
                                    meta.textClass,
                                    meta.borderClass,
                                  )}
                                >
                                  {meta.short}
                                </span>
                              )}
                              <span className="font-mono shrink-0">{item.plu}</span>
                            </div>
                            <div className="truncate" title={pickLabel(item)}>
                              {pickLabel(item)}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromStaging(item)}
                            title="Entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            </div>
            <div className="p-3 pt-2 border-t flex flex-col gap-2 shrink-0 bg-card">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={busy}>
                Abbrechen
              </Button>
              <Button
                type="button"
                disabled={busy || !displayName.trim() || stagingKeys.size === 0}
                onClick={() => saveMutation.mutate()}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Speichern…
                  </>
                ) : isEditMode ? (
                  'Speichern'
                ) : (
                  'Gruppe anlegen'
                )}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
