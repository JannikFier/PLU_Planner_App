import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BACKSHOP_SOURCE_META } from '@/lib/backshop-sources'
import type { BackshopMasterPLUItem } from '@/types/database'
import {
  buildMemberToGroupMap,
  classifyMemberKeysForApply,
  filterContainsPickerRows,
  filterSearchPickerRows,
  memberPickerKey,
  pickDisplayName,
  rankSimilarPickerRows,
  reasonCodeLabelDe,
  type ClassifiedMemberKey,
  type MemberPickerGroupLite,
  type MemberPickerRow,
  type MemberPickerRowStatus,
} from '@/lib/backshop-product-group-member-picker'
import { cn } from '@/lib/utils'

function renderHighlighted(text: string, ranges: Array<{ start: number; end: number }>) {
  if (!ranges.length) return text
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const parts: ReactNode[] = []
  let pos = 0
  let k = 0
  for (const r of sorted) {
    if (r.start > pos) {
      parts.push(<span key={`t${k++}`}>{text.slice(pos, r.start)}</span>)
    }
    if (r.end > r.start) {
      parts.push(
        <mark key={`m${k++}`} className="rounded bg-amber-200/90 px-0.5 text-foreground">
          {text.slice(r.start, r.end)}
        </mark>,
      )
    }
    pos = Math.max(pos, r.end)
  }
  if (pos < text.length) {
    parts.push(<span key={`t${k++}`}>{text.slice(pos)}</span>)
  }
  return <>{parts}</>
}

function statusBadge(status: MemberPickerRowStatus, otherGroupName?: string) {
  if (status === 'free') {
    return (
      <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-200 bg-emerald-50 text-emerald-800">
        Frei
      </Badge>
    )
  }
  if (status === 'in_other_group') {
    return (
      <Badge variant="outline" className="text-[10px] shrink-0 max-w-[140px] truncate" title={otherGroupName}>
        Andere Gruppe{otherGroupName ? `: ${otherGroupName}` : ''}
      </Badge>
    )
  }
  return null
}

export interface BackshopProductGroupMemberPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  groupDisplayName: string
  /** Mitglieder der Zielgruppe für Anker-Dropdown (Name = system/Anzeige). */
  memberAnchors: Array<{ plu: string; source: string; name: string }>
  masterItems: BackshopMasterPLUItem[]
  groupsLite: MemberPickerGroupLite[]
  isApplying?: boolean
  onApply: (items: ClassifiedMemberKey[]) => void | Promise<void>
}

type PickerTab = 'search' | 'similar' | 'contains'
type PickerStep = 'pick' | 'preview'

export function BackshopProductGroupMemberPickerDialog({
  open,
  onOpenChange,
  groupId,
  groupDisplayName,
  memberAnchors,
  masterItems,
  groupsLite,
  isApplying = false,
  onApply,
}: BackshopProductGroupMemberPickerDialogProps) {
  const [step, setStep] = useState<PickerStep>('pick')
  const [tab, setTab] = useState<PickerTab>('similar')
  const [anchorTouched, setAnchorTouched] = useState(false)
  const [userAnchor, setUserAnchor] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [containsNeedle, setContainsNeedle] = useState('')
  const [containsIgnoreCase, setContainsIgnoreCase] = useState(true)
  const [allowMoveFromOther, setAllowMoveFromOther] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())

  const memberToGroup = useMemo(() => buildMemberToGroupMap(groupsLite), [groupsLite])

  const defaultAnchor = useMemo(() => {
    const first = memberAnchors[0]?.name?.trim()
    return first || groupDisplayName.trim() || ''
  }, [memberAnchors, groupDisplayName])
  const anchorText = !anchorTouched ? defaultAnchor : userAnchor

  const resetFormState = useCallback(() => {
    setStep('pick')
    setTab('similar')
    setSearchQuery('')
    setContainsNeedle('')
    setContainsIgnoreCase(true)
    setAllowMoveFromOther(false)
    setSelectedKeys(new Set())
    setAnchorTouched(false)
    setUserAnchor('')
  }, [])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetFormState()
    } else {
      setAnchorTouched(false)
      setUserAnchor('')
    }
    onOpenChange(next)
  }

  const similarRows = useMemo(() => {
    return rankSimilarPickerRows({
      masterItems,
      memberToGroup,
      targetGroupId: groupId,
      anchorText,
    })
  }, [masterItems, memberToGroup, groupId, anchorText])

  const searchRows = useMemo(() => {
    return filterSearchPickerRows({
      masterItems,
      memberToGroup,
      targetGroupId: groupId,
      query: searchQuery,
    })
  }, [masterItems, memberToGroup, groupId, searchQuery])

  const containsRows = useMemo(() => {
    return filterContainsPickerRows({
      masterItems,
      memberToGroup,
      targetGroupId: groupId,
      needle: containsNeedle,
      ignoreCase: containsIgnoreCase,
    })
  }, [masterItems, memberToGroup, groupId, containsNeedle, containsIgnoreCase])

  const visibleRows: MemberPickerRow[] = useMemo(() => {
    if (tab === 'search') return searchRows
    if (tab === 'contains') return containsRows
    return similarRows
  }, [tab, searchRows, containsRows, similarRows])

  const toggleKey = useCallback(
    (row: MemberPickerRow) => {
      const src = row.item.source ?? 'edeka'
      const key = memberPickerKey(row.item.plu, src)
      if (row.status === 'in_other_group' && !allowMoveFromOther) return
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [allowMoveFromOther],
  )

  const preview = useMemo(() => {
    return classifyMemberKeysForApply([...selectedKeys], groupId, memberToGroup)
  }, [selectedKeys, groupId, memberToGroup])

  const handleGoPreview = () => {
    if (selectedKeys.size === 0) return
    setStep('preview')
  }

  const handleApply = async () => {
    await onApply(preview.toApply)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-testid="backshop-member-picker-dialog"
        className="max-w-4xl w-[calc(100vw-2rem)] max-h-[min(90vh,880px)] flex flex-col gap-0 p-0 overflow-hidden"
      >
        <div className="px-6 pt-6 pb-3 shrink-0 border-b">
          <DialogHeader>
            <DialogTitle>Mitglieder hinzufügen</DialogTitle>
            <p className="text-sm text-muted-foreground text-left font-normal">
              Zielgruppe: <span className="font-medium text-foreground">{groupDisplayName}</span> · nur Zeilen der
              aktiven Backshop-Version · (PLU+Quelle) ist global nur einer Gruppe zugeordnet.
            </p>
          </DialogHeader>
        </div>

        {step === 'pick' ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-3 space-y-3 shrink-0">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <Label htmlFor="picker-anchor">Referenz für „Ähnlich“ (Anker)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vorschläge beziehen sich auf diesen Text; Stammdaten der Artikel ändern sich nicht.
                  </p>
                  <div className="space-y-2 mt-1">
                    {memberAnchors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground shrink-0">Aus Mitglied:</span>
                        {memberAnchors.map((a) => (
                          <Button
                            key={memberPickerKey(a.plu, a.source)}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setAnchorTouched(true)
                              setUserAnchor(a.name)
                            }}
                          >
                            {a.name}{' '}
                            <span className="font-mono text-[10px] opacity-70">
                              {a.plu} · {BACKSHOP_SOURCE_META[a.source as keyof typeof BACKSHOP_SOURCE_META]?.short ?? a.source}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                    <Input
                      id="picker-anchor"
                      value={anchorText}
                      onChange={(e) => {
                        setAnchorTouched(true)
                        setUserAnchor(e.target.value)
                      }}
                      placeholder="z. B. Apfelberliner"
                      className="max-w-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Info className="h-3.5 w-3.5" /> Legende
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800">
                  Frei
                </Badge>
                <span>= noch keiner Gruppe</span>
                <Badge variant="outline" className="text-[10px]">
                  Andere Gruppe
                </Badge>
                <span>= bereits zugeordnet</span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-move"
                  checked={allowMoveFromOther}
                  onCheckedChange={(c) => {
                    const on = c === true
                    setAllowMoveFromOther(on)
                    if (!on) {
                      setSelectedKeys((prev) => {
                        const next = new Set(prev)
                        for (const key of prev) {
                          const pipe = key.indexOf('|')
                          if (pipe < 0) continue
                          const st = memberToGroup.get(key)
                          if (st && st.groupId !== groupId) next.delete(key)
                        }
                        return next
                      })
                    }
                  }}
                />
                <Label htmlFor="allow-move" className="text-sm font-normal cursor-pointer leading-snug">
                  Verschieben aus anderen Produktgruppen erlauben (entfernt dort die Zuordnung)
                </Label>
              </div>
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as PickerTab)}
              className="flex flex-col min-h-0 flex-1 px-6 overflow-hidden"
            >
              <TabsList className="shrink-0">
                <TabsTrigger value="similar">Ähnlich</TabsTrigger>
                <TabsTrigger value="search">Suche</TabsTrigger>
                <TabsTrigger value="contains">Enthält</TabsTrigger>
              </TabsList>
              <TabsContent value="similar" className="flex flex-col gap-2 mt-2 min-h-0 flex-1 data-[state=inactive]:hidden">
                {!anchorText.trim() ? (
                  <p className="text-sm text-muted-foreground">Bitte einen Referenztext eingeben, um Vorschläge zu sehen.</p>
                ) : similarRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine ähnlichen Artikel außerhalb dieser Gruppe gefunden.</p>
                ) : null}
              </TabsContent>
              <TabsContent value="search" className="flex flex-col gap-2 mt-2 min-h-0 flex-1 data-[state=inactive]:hidden">
                <Input
                  placeholder="PLU oder Name …"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
                {!searchQuery.trim() ? (
                  <p className="text-sm text-muted-foreground">Suchbegriff eingeben.</p>
                ) : searchRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Treffer.</p>
                ) : null}
              </TabsContent>
              <TabsContent value="contains" className="flex flex-col gap-2 mt-2 min-h-0 flex-1 data-[state=inactive]:hidden">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="contains-needle">Name enthält</Label>
                    <Input
                      id="contains-needle"
                      className="mt-1"
                      value={containsNeedle}
                      onChange={(e) => setContainsNeedle(e.target.value)}
                      placeholder="z. B. Apfelberliner"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm pb-2">
                    <Checkbox
                      checked={containsIgnoreCase}
                      onCheckedChange={(c) => setContainsIgnoreCase(c === true)}
                    />
                    Groß-/Kleinschreibung ignorieren
                  </label>
                </div>
                {!containsNeedle.trim() ? (
                  <p className="text-sm text-muted-foreground">Text eingeben, um zu filtern.</p>
                ) : containsRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Treffer.</p>
                ) : null}
              </TabsContent>
            </Tabs>

            <ScrollArea className="flex-1 min-h-[200px] border-y px-6 basis-0">
              <div className="pr-3 py-3 space-y-1">
                {visibleRows.map((row) => {
                  const src = row.item.source ?? 'edeka'
                  const key = memberPickerKey(row.item.plu, src)
                  const meta = BACKSHOP_SOURCE_META[src as keyof typeof BACKSHOP_SOURCE_META]
                  const otherName =
                    row.status === 'in_other_group' ? memberToGroup.get(key)?.displayName : undefined
                  const disabled = row.status === 'in_other_group' && !allowMoveFromOther
                  const checked = selectedKeys.has(key)
                  const label = pickDisplayName(row.item)
                  return (
                    <div
                      role="button"
                      tabIndex={disabled ? -1 : 0}
                      key={key}
                      onKeyDown={(e) => {
                        if (disabled) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleKey(row)
                        }
                      }}
                      onClick={() => {
                        if (!disabled) toggleKey(row)
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 rounded-md border px-2 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer',
                        checked && !disabled ? 'border-primary/50 bg-primary/5' : 'bg-card',
                      )}
                    >
                      <span
                        className="pt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => {
                            if (!disabled) toggleKey(row)
                          }}
                        />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {statusBadge(row.status, otherName)}
                          {meta && (
                            <span
                              className={cn(
                                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border',
                                meta.bgClass,
                                meta.textClass,
                                meta.borderClass,
                              )}
                            >
                              {meta.short}
                            </span>
                          )}
                          <span className="font-mono text-xs">{row.item.plu}</span>
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {reasonCodeLabelDe(row.reasonCode)}
                          </Badge>
                          {tab === 'similar' && <span className="text-[10px] text-muted-foreground">Score {row.score}</span>}
                        </div>
                        <div className="break-words">{renderHighlighted(label, row.highlightRanges)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row justify-between sm:justify-between gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="button" onClick={handleGoPreview} disabled={selectedKeys.size === 0}>
                Weiter zur Vorschau ({selectedKeys.size})
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3 flex-1 min-h-0 flex flex-col">
              <Button type="button" variant="ghost" size="sm" className="self-start -ml-2" onClick={() => setStep('pick')}>
                Zurück zur Auswahl
              </Button>
              <p className="text-sm text-muted-foreground">
                {preview.toApply.filter((x) => x.kind === 'new').length} neu ·{' '}
                {preview.toApply.filter((x) => x.kind === 'move').length} Verschiebung(en) ·{' '}
                {preview.skippedInTarget.length} bereits in dieser Gruppe (übersprungen)
              </p>
              {preview.toApply.some((x) => x.kind === 'move') && (
                <Alert>
                  <AlertTitle>Verschieben</AlertTitle>
                  <AlertDescription>
                    Die folgenden Zeilen werden aus ihrer bisherigen Produktgruppe entfernt und dieser Gruppe
                    zugeordnet.
                  </AlertDescription>
                </Alert>
              )}
              <ScrollArea className="flex-1 min-h-[200px] max-h-[48vh] border rounded-md">
                <ul className="p-3 space-y-2 text-sm">
                  {preview.toApply.map((t) => {
                    const rowItem = masterItems.find(
                      (i) => i.plu === t.plu && (i.source ?? 'edeka') === t.source,
                    )
                    const name = rowItem ? pickDisplayName(rowItem) : '—'
                    return (
                      <li
                        key={t.key}
                        className="flex flex-wrap items-baseline gap-2 rounded-md border bg-muted/20 px-2 py-1.5"
                      >
                        <span className="font-mono text-xs">{t.plu}</span>
                        <span className="text-xs">{BACKSHOP_SOURCE_META[t.source]?.label ?? t.source}</span>
                        {t.kind === 'move' ? (
                          <Badge variant="outline" className="text-[10px]">
                            Verschieben von «{t.fromGroupDisplayName ?? '?'}»
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-800"
                          >
                            Neu
                          </Badge>
                        )}
                        <span className="text-muted-foreground break-all">{name}</span>
                      </li>
                    )
                  })}
                </ul>
              </ScrollArea>
            </div>
            <DialogFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => setStep('pick')}>
                Zurück
              </Button>
              <Button type="button" onClick={() => void handleApply()} disabled={isApplying || preview.toApply.length === 0}>
                {isApplying ? 'Speichern…' : 'Übernehmen'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
