/**
 * Marken-Auswahl (Backshop): pro Markt, welche Quellen pro Produktgruppe sichtbar sind.
 * Design: Stone + Blau-Akzente (Logo), ab 1024px Desktop-Zweispalter; schmaler Viewport: Akkordeon unter der Gruppenzeile.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopProductGroups, type BackshopProductGroupWithMembers } from '@/hooks/useBackshopProductGroups'
import { useStoreBackshopNameBlockOverrides } from '@/hooks/useStoreBackshopBlockLayout'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import {
  useBackshopSourceChoicesForStore,
  useSaveBackshopSourceChoice,
} from '@/hooks/useBackshopSourceChoices'
import { formatError } from '@/lib/error-messages'
import { useAuth } from '@/hooks/useAuth'
import type { BackshopSource } from '@/types/database'
import { getGroupListStatus, matchesListFilter, type MarkenListFilter } from '@/lib/marken-auswahl-state'
import { useBackshopSourceRulesForStore } from '@/hooks/useBackshopSourceRules'
import { MarkenAuswahlStatusBand } from '@/components/marken-auswahl/MarkenAuswahlStatusBand'
import { MasterlistPreview } from '@/components/marken-auswahl/MasterlistPreview'
import { GruppenSidebarList } from '@/components/marken-auswahl/GruppenSidebarList'
import { MarkenKarteDesktop, MarkenKarteMobileRow, type KarteZustand } from '@/components/marken-auswahl/MarkenKarte'
import { dashboardRolePrefixFromPathname } from '@/lib/dashboard-role-prefix'
import { useBackshopMarkenAuswahlDerived } from '@/hooks/useBackshopMarkenAuswahlDerived'
import { useMediaMinWidth } from '@/hooks/useMediaMinWidth'

function FieldHelp({ id, text }: { id: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-stone-200 text-[10px] font-medium text-stone-500 align-middle shrink-0"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <span id={id}>{text}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export const MARKEN_AUSWAHl_ROUTE_SEGMENT = 'marken-auswahl' as const

function resolveZustand(
  source: BackshopSource,
  chosen: BackshopSource[],
  isExclusive: boolean,
): KarteZustand {
  if (isExclusive && chosen.length === 1) {
    if (source === chosen[0]) return 'exclusive'
    return 'dimmed'
  }
  if (chosen.includes(source)) return 'active'
  return 'inactive'
}

export function BackshopMarkenAuswahlPage() {
  const { currentStoreId } = useCurrentStore()
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isSplit = useMediaMinWidth(1024)
  const detailRef = useRef<HTMLDivElement>(null)

  const rolePrefix = dashboardRolePrefixFromPathname(location.pathname)
  const isSuperAdmin = profile?.role === 'super_admin'

  const { data: blocks = [] } = useBackshopBlocks()
  const { data: groupsRaw = [], isLoading: groupsLoading } = useBackshopProductGroups()
  const { data: storeBackshopNameOverrides = [] } = useStoreBackshopNameBlockOverrides()
  const nameBlockOverrides = useMemo(
    () => buildNameBlockOverrideMap(storeBackshopNameOverrides),
    [storeBackshopNameOverrides],
  )
  const groups = useMemo(
    () => scopeProductGroupsByEffectiveBlock(groupsRaw, nameBlockOverrides),
    [groupsRaw, nameBlockOverrides],
  )
  const { data: choices = [], isLoading: choicesLoading } = useBackshopSourceChoicesForStore(currentStoreId)
  const { data: backshopBlockSourceRules = [] } = useBackshopSourceRulesForStore(currentStoreId)
  const saveChoice = useSaveBackshopSourceChoice()

  const { choiceByGroup, memberSourcesFor, choiceBaselineForGroup, withMeta } =
    useBackshopMarkenAuswahlDerived(groups, choices, backshopBlockSourceRules)

  const [search, setSearch] = useState('')
  const [listFilter, setListFilter] = useState<MarkenListFilter>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [listFocusGroupId, setListFocusGroupId] = useState<string | null>(null)
  const [exclusiveByGroup, setExclusiveByGroup] = useState<Record<string, boolean>>({})
  const [doneSummary, setDoneSummary] = useState<null | { total: number; bewusst: number; offen: number }>(null)
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)

  const q = search.trim().toLowerCase()
  const filteredRows = useMemo(() => {
    return withMeta.filter((row) => {
      if (q) {
        const inName = row.g.display_name.toLowerCase().includes(q)
        const inMem = row.g.resolvedItems.some(
          (it) => it.system_name.toLowerCase().includes(q) || it.plu.toLowerCase().includes(q),
        )
        if (!inName && !inMem) return false
      }
      return matchesListFilter(row.st, listFilter)
    })
  }, [withMeta, q, listFilter])

  const selectedInFilter =
    selectedGroupId == null ? null : (filteredRows.find((r) => r.g.id === selectedGroupId) ?? null)

  const current = isSplit
    ? selectedInFilter ?? filteredRows[0] ?? null
    : selectedInFilter ?? null

  const indexInFiltered = current ? filteredRows.findIndex((r) => r.g.id === current.g.id) : 0
  const totalF = filteredRows.length
  const isLast = totalF > 0 && indexInFiltered >= totalF - 1

  const coercedGroupId = useMemo(() => {
    if (filteredRows.length === 0) return null
    if (isSplit) {
      if (selectedGroupId && filteredRows.some((r) => r.g.id === selectedGroupId)) {
        return selectedGroupId
      }
      return filteredRows[0]!.g.id
    }
    if (selectedGroupId && filteredRows.some((r) => r.g.id === selectedGroupId)) {
      return selectedGroupId
    }
    return null
  }, [filteredRows, selectedGroupId, isSplit])

  if (coercedGroupId !== selectedGroupId) {
    setSelectedGroupId(coercedGroupId)
  }

  const toggleNarrowGroup = useCallback((id: string) => {
    setSelectedGroupId((s) => (s === id ? null : id))
  }, [])

  const persistIfFullSelection = (groupId: string) => {
    const mem = memberSourcesFor(groupId)
    if (mem.length === 0) return
    const baseline = choiceBaselineForGroup(groupId)
    const inSet = new Set(baseline.filter((s) => mem.includes(s)))
    if (mem.length > 0 && mem.every((s) => inSet.has(s)) && inSet.size === mem.length) {
      saveChoice.mutate(
        { groupId, chosenSources: mem, origin: 'manual' },
        { onError: (err) => toast.error(`Speichern: ${formatError(err)}`) },
      )
    }
  }

  // URL-Param focusGroup: einmaliger Sync in Router-State; setState in Effect nötig
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const id = searchParams.get('focusGroup')
    if (!id || groups.length === 0) return
    if (groups.some((g) => g.id === id)) {
      setSelectedGroupId(id)
      setListFocusGroupId(id)
    }
    const next = new URLSearchParams(searchParams)
    next.delete('focusGroup')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, groups])
  /* eslint-enable react-hooks/set-state-in-effect */

  const goNext = () => {
    if (totalF === 0) return
    if (current) persistIfFullSelection(current.g.id)
    if (indexInFiltered < 0) return
    if (indexInFiltered < totalF - 1) setSelectedGroupId(filteredRows[indexInFiltered + 1]!.g.id)
    else {
      const bewusst = withMeta.filter((r) => r.st === 'teil' || r.st === 'confirmed').length
      setDoneSummary({ total: groups.length, bewusst, offen: withMeta.filter((r) => r.st === 'offen').length })
    }
  }

  const goPrev = () => {
    if (indexInFiltered > 0) setSelectedGroupId(filteredRows[indexInFiltered - 1]!.g.id)
  }

  const onKeyDetail = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    }
  }

  const onSidebarArrow = (d: 'up' | 'down') => {
    if (d === 'down' && indexInFiltered < totalF - 1) {
      setSelectedGroupId(filteredRows[indexInFiltered + 1]!.g.id)
    } else if (d === 'up' && indexInFiltered > 0) {
      setSelectedGroupId(filteredRows[indexInFiltered - 1]!.g.id)
    }
  }

  const navigateToBackshopList = () => {
    const rowToPersist = isSplit ? (selectedInFilter ?? filteredRows[0] ?? null) : selectedInFilter
    if (rowToPersist) persistIfFullSelection(rowToPersist.g.id)
    const fromQuery = new URLSearchParams(location.search).get('backTo')
    const fromState = (location.state as { backTo?: string } | null)?.backTo
    const target = fromQuery || fromState || `${rolePrefix}/backshop-list`
    navigate(target)
  }

  const setExclusive = (groupId: string, source: BackshopSource) => {
    setExclusiveByGroup((e) => ({ ...e, [groupId]: true }))
    saveChoice.mutate(
      { groupId, chosenSources: [source], origin: 'manual' },
      { onError: (err) => toast.error(`Speichern fehlgeschlagen: ${formatError(err)}`) },
    )
  }

  const toggleSource = (groupId: string, source: BackshopSource) => {
    if (exclusiveByGroup[groupId]) {
      setExclusiveByGroup((e) => {
        const n = { ...e }
        delete n[groupId]
        return n
      })
    }
    const baseline = choiceBaselineForGroup(groupId)
    const next = baseline.includes(source)
      ? baseline.filter((s) => s !== source)
      : [...baseline, source]
    saveChoice.mutate(
      { groupId, chosenSources: next, origin: 'manual' },
      { onError: (err) => toast.error(`Speichern fehlgeschlagen: ${formatError(err)}`) },
    )
  }

  const blockLabel = (bid: string | null) => (bid && blocks.find((b) => b.id === bid)?.name) || 'Ohne Warengruppe'

  const startLong = (gid: string, source: BackshopSource) => {
    longPressFired.current = false
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true
      setExclusive(gid, source)
    }, 500) as unknown as number
  }
  const endLong = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  if (doneSummary) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-md mx-auto pt-8 px-4">
          <Card className="p-8 text-center space-y-4 border-stone-200">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-800">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900">Alle {doneSummary.total} Gruppen durchgegangen</h2>
            <p className="text-sm text-stone-600 text-left">
              {doneSummary.bewusst} Gruppen mit bewusster Auswahl, {doneSummary.offen} bleiben ohne Festlegung
              (alle Marken sichtbar). Änderungen sind jederzeit über die Masterliste wieder aufrufbar.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDoneSummary(null)
                  if (!isSplit) {
                    setSelectedGroupId(null)
                  } else if (filteredRows[0]) {
                    setSelectedGroupId(filteredRows[0]!.g.id)
                  }
                }}
              >
                Übersicht anzeigen
              </Button>
              <Button type="button" onClick={navigateToBackshopList}>
                Zurück zur Masterliste
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (groupsLoading || choicesLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 max-w-3xl">
          <Skeleton className="h-10 w-2/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    )
  }

  if (groups.length === 0) {
    return (
      <DashboardLayout>
        <div className="w-full max-w-md mx-auto pt-12">
          <Card className="p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-lg bg-stone-100 border border-stone-200 mx-auto" />
            <h2 className="text-base font-semibold">Keine Produktgruppen gefunden</h2>
            <p className="text-sm text-stone-600 text-left">
              Sobald Artikel aus dem ERP importiert wurden, erscheinen hier alle Gruppen mit mehreren
              Marken-Varianten.{' '}
              {isSuperAdmin ? 'Pflege: Upload und Produktgruppen (Super-Admin).' : 'Wende dich ggf. an die Zentrale.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {isSuperAdmin && (
                <>
                  <Button variant="outline" type="button" onClick={() => navigate('/super-admin/backshop-upload')}>
                    Upload-Status
                  </Button>
                  <Button type="button" onClick={() => navigate('/super-admin/backshop-product-groups')}>
                    Produktgruppen
                  </Button>
                </>
              )}
              <Button type="button" onClick={() => navigate(`${rolePrefix}/backshop-list`)}>
                Zur Backshop-Liste
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const renderDetail = (c: (typeof withMeta)[0] | null) => {
    if (!c) return <p className="text-stone-500">Keine Gruppe ausgewählt.</p>
    const gid = c.g.id
    const mem = c.mem
    const ch = c.chosen
    const excl = Boolean(exclusiveByGroup[gid] && ch.length === 1)
    const previewItems = c.g.resolvedItems.map((it) => ({
      plu: it.plu,
      source: it.source as BackshopSource,
      name: it.display_name || it.system_name,
    }))

    return (
        <div className="space-y-4 min-h-0" role="region" aria-label="Produktgruppen-Detail">
          <div>
            <div className="text-xs text-stone-500 flex flex-wrap items-center gap-1.5">
              {blockLabel(c.g.block_id)} ·
              <span className="font-mono">#{c.g.id.slice(0, 4)}</span>
              <FieldHelp
                id="h-wg"
                text="Warengruppe. Übergeordnete Sortimentskategorie. Legt in dieser Ansicht die Gruppierung in der Seitenleiste fest."
              />
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900 tracking-[-0.015em] flex items-center flex-wrap gap-2">
              <span>
                {c.g.display_name}
                <FieldHelp
                  id="h-pg"
                  text="Produktgruppe. Mehrere Marken-Artikel, die denselben logischen Artikel im Sortiment abbilden."
                />
              </span>
              <Badge variant="secondary" className="text-xs font-normal">
                {c.g.members.length} Marken
              </Badge>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              <span className="font-mono">PLU</span>
              <FieldHelp
                id="h-plu"
                text="Preislook-up-Nummer. Eindeutige Artikelnummer aus dem ERP."
              />
              <FieldHelp
                id="h-grundregel"
                text="Ohne eigene Marken-Auswahl in der Datenbank gilt für diese Produktgruppe die Warengruppen-Grundregel (bevorzugte Marke), sofern die Gruppe einer Warengruppe zugeordnet ist. In der Masterliste werden dann nur diese Marken gezeigt (Ausnahme: aktuelle Werbung/Angebote). Alle Marken gleichzeitig: hier alle Karten aktiv lassen und speichern."
              />
            </p>
          </div>
          <MarkenAuswahlStatusBand
            kind="rules"
            memberSrc={mem}
            chosen={ch}
            isExclusiveMode={excl}
            overridePartial={
              getGroupListStatus(mem, ch) === 'teil' ? { n: ch.filter((s) => mem.includes(s)).length, m: mem.length } : undefined
            }
          />
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5"
            data-tour="backshop-marken-auswahl-list"
          >
            {c.g.resolvedItems.map((it, idx) => {
              const src = it.source as BackshopSource
              const isChosen = ch.includes(src)
              const zu = resolveZustand(src, ch, excl)
              return (
                <MarkenKarteDesktop
                  key={`${it.plu}-${it.source}`}
                  plu={it.plu}
                  name={it.display_name || it.system_name}
                  source={src}
                  imageUrl={it.image_url}
                  zustand={zu}
                  isChosen={isChosen}
                  ariaLabel={`Marke ${src}, ${it.display_name || it.system_name}, PLU ${it.plu}, ${
                    isChosen ? 'gewählt' : 'nicht gewählt'
                  }`}
                  onClick={() => toggleSource(gid, src)}
                  onDoubleClick={() => setExclusive(gid, src)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault()
                      setExclusive(gid, src)
                    }
                  }}
                  dataTour={idx === 0 ? 'backshop-marken-auswahl-first-card' : undefined}
                  badgeDataTour={idx === 0 ? 'backshop-marken-auswahl-source-badge' : undefined}
                />
              )
            })}
          </div>
          {isSplit && (
            <p className="text-xs text-stone-500">
              Einfachklick: Mehrfachauswahl · Doppelklick: Nur diese Marke · <kbd className="px-0.5">Umschalt</kbd>+
              <kbd className="px-0.5">Enter</kbd> = nur diese Marke
            </p>
          )}
          <Separator className="my-6" />
          <MasterlistPreview
            items={previewItems}
            memberSrc={mem}
            chosenEff={ch}
            isExclusiveMode={excl}
          />
        </div>
    )
  }

  /** Schmal: Marken-Steuerung unter der Gruppenzeile (Akkordeon) */
  const renderNarrowMarkenPanel = (groupId: string): ReactNode => {
    const c = withMeta.find((r) => r.g.id === groupId)
    if (!c) {
      return (
        <div className="p-3 text-stone-500 text-sm" data-testid="marken-auswahl-detail">
          Gruppe nicht gefunden.
        </div>
      )
    }
    const mem = c.mem
    const ch = c.chosen
    const excl = Boolean(exclusiveByGroup[c.g.id] && ch.length === 1)
    const previewItems = c.g.resolvedItems.map((it) => ({
      plu: it.plu,
      source: it.source as BackshopSource,
      name: it.display_name || it.system_name,
    }))
    return (
      <div
        className="px-3 py-3 space-y-3"
        data-testid="marken-auswahl-detail"
        data-tour="backshop-marken-auswahl-accordion"
      >
        <div>
          <p className="text-[11.5px] text-stone-500 uppercase tracking-wide">{blockLabel(c.g.block_id)}</p>
          <h2 className="text-lg font-semibold text-stone-900 mt-0.5">{c.g.display_name}</h2>
          <Badge className="self-start text-xs font-normal mt-1" variant="secondary">
            {c.g.members.length} Marken
          </Badge>
        </div>
        <MarkenAuswahlStatusBand
          kind="rules"
          memberSrc={mem}
          chosen={ch}
          isExclusiveMode={excl}
          overridePartial={
            getGroupListStatus(mem, ch) === 'teil'
              ? { n: ch.filter((s) => mem.includes(s)).length, m: mem.length }
              : undefined
          }
        />
        <div className="space-y-2" data-tour="backshop-marken-auswahl-list">
          {c.g.resolvedItems.map((it, idx) => {
            const src = it.source as BackshopSource
            const isChosen = ch.includes(src)
            const zu = resolveZustand(src, ch, excl)
            return (
              <MarkenKarteMobileRow
                key={`m-${it.plu}-${it.source}`}
                plu={it.plu}
                name={it.display_name || it.system_name}
                source={src}
                imageUrl={it.image_url}
                zustand={zu}
                isChosen={isChosen}
                ariaLabel={`Marke, ${it.display_name || it.system_name}, PLU ${it.plu}, ${isChosen ? 'gewählt' : 'nicht gewählt'}`}
                onClick={() => {
                  if (longPressFired.current) {
                    longPressFired.current = false
                    return
                  }
                  toggleSource(c.g.id, src)
                }}
                onPointerDown={() => startLong(c.g.id, src)}
                onPointerUp={endLong}
                onPointerLeave={endLong}
                dataTour={idx === 0 ? 'backshop-marken-auswahl-first-card' : undefined}
                badgeDataTour={idx === 0 ? 'backshop-marken-auswahl-source-badge' : undefined}
              />
            )
          })}
        </div>
        <p className="text-[11px] text-center text-stone-500">
          Antippen: Mehrfachauswahl · lang drücken: nur diese Marke
        </p>
        <Separator className="my-2" />
        <div data-tour="backshop-marken-auswahl-preview">
          <MasterlistPreview
            items={previewItems}
            memberSrc={mem}
            chosenEff={ch}
            isExclusiveMode={excl}
          />
        </div>
      </div>
    )
  }

  if (!isSplit) {
    const pr = totalF > 0 && current ? ((indexInFiltered + 1) / totalF) * 100 : 0
    return (
      <div className="min-h-dvh flex flex-col bg-stone-50/50" data-tour="backshop-marken-auswahl-page">
        <div className="shrink-0 z-20 border-b border-stone-200 bg-white px-4 py-2">
          <div className="flex items-center justify-center min-h-11 relative">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-11 p-0 absolute left-0"
              onClick={() => {
                if (selectedGroupId) setSelectedGroupId(null)
                else navigateToBackshopList()
              }}
              aria-label={selectedGroupId ? 'Zur Übersicht' : 'Zur Backshop-Liste'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-[13px] font-semibold text-stone-900 pr-1">Marken-Auswahl (Backshop)</span>
            <span className="absolute right-0 w-11" aria-hidden />
          </div>
          {selectedGroupId && (
            <div className="h-1 w-full rounded bg-blue-100 mt-1 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-150" style={{ width: `${pr}%` }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <GruppenSidebarList
            groups={groups as BackshopProductGroupWithMembers[]}
            blocks={blocks}
            search={search}
            onSearch={setSearch}
            listFilter={listFilter}
            onListFilter={setListFilter}
            choiceByGroup={choiceByGroup}
            memberSourcesFor={memberSourcesFor}
            selectedGroupId={selectedGroupId}
            onSelectGroup={toggleNarrowGroup}
            focusGroupId={listFocusGroupId}
            onFocusConsumed={() => setListFocusGroupId(null)}
            layout="full"
            inlineExpandedGroupId={selectedGroupId}
            renderGroupInlinePanel={renderNarrowMarkenPanel}
          />
        </div>
        {selectedGroupId && current && (
          <div className="shrink-0 z-20 border-t border-stone-200 bg-white p-3 flex gap-2">
            <Button type="button" variant="outline" className="flex-1 min-h-11" disabled={indexInFiltered <= 0} onClick={goPrev}>
              Zurück
            </Button>
            {isLast ? (
              <Button
                className="flex-[2] min-h-11 bg-blue-700 hover:bg-blue-800"
                type="button"
                onClick={() => {
                  persistIfFullSelection(current.g.id)
                  goNext()
                }}
              >
                Fertig
              </Button>
            ) : (
              <Button
                className="flex-[2] min-h-11 bg-blue-700 hover:bg-blue-800"
                type="button"
                onClick={() => {
                  persistIfFullSelection(current.g.id)
                  goNext()
                }}
              >
                Weiter
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Desktop: split
  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
      <div
        className="flex flex-col min-h-[min(100dvh,900px)] max-w-[100vw] bg-stone-50/30"
        data-tour="backshop-marken-auswahl-page"
      >
        <div className="border-b border-stone-200 bg-white min-[1024px]:px-4 min-[1024px]:py-2.5">
          <h1 className="text-[15px] font-semibold text-stone-900">Marken-Auswahl (Backshop)</h1>
        </div>
        <div
          className="grid min-h-0 flex-1 grid-cols-1 min-[1024px]:grid-cols-[360px_1fr] min-[1024px]:[grid-template-rows:1fr] overflow-hidden"
        >
          <div className="min-h-0 min-[1024px]:h-full min-[1024px]:min-h-0 min-[1024px]:max-h-[calc(100dvh-120px)]">
            <GruppenSidebarList
              groups={groups as BackshopProductGroupWithMembers[]}
              blocks={blocks}
              search={search}
              onSearch={setSearch}
              listFilter={listFilter}
              onListFilter={setListFilter}
              choiceByGroup={choiceByGroup}
              memberSourcesFor={memberSourcesFor}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
              focusGroupId={listFocusGroupId}
              onFocusConsumed={() => setListFocusGroupId(null)}
              onArrowKey={onSidebarArrow}
            />
          </div>
          <div
            className="min-h-0 overflow-y-auto p-4 md:p-8 space-y-4 min-[1024px]:max-h-[calc(100dvh-120px)]"
            tabIndex={0}
            onKeyDown={onKeyDetail}
            ref={detailRef}
          >
            {current ? renderDetail(current) : <p className="text-stone-500">Kein Eintrag in der Seitenleiste wählbar.</p>}
            {current && (
              <div className="flex flex-wrap justify-between items-center gap-2 pt-4">
                <Button type="button" variant="outline" onClick={goPrev} disabled={indexInFiltered <= 0}>
                  Zurück
                </Button>
                {isLast ? (
                  <Button
                    type="button"
                    onClick={() => {
                      if (current) persistIfFullSelection(current.g.id)
                      goNext()
                    }}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    Fertig
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      if (current) persistIfFullSelection(current.g.id)
                      goNext()
                    }}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    Weiter
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}
