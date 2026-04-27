// Zusammenfassung + Auto-Zuordnung der Warengruppen beim Backshop-Upload.
// Zeigt in Schritt 2: wie viele Produkte bereits einer Warengruppe zugeordnet sind,
// Auto-Zuordnen-/Zurücksetzen-Buttons, und aufklappbar die komplette Liste zum manuellen
// Zuordnen der offenen Produkte.

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Sparkles, RotateCcw, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { BackshopThumbnail } from '@/components/plu/BackshopThumbnail'
import type { BackshopCompareItem } from '@/types/plu'
import type { BackshopBlock } from '@/types/database'

interface BackshopUploadGroupAssignmentProps {
  /** Alle Produkte, die eine Zuordnung brauchen (neu + unverändert ohne block_id). */
  newItems: BackshopCompareItem[]
  /** Aktuelle Zuordnung: PLU → block_id (null/undefined = keine Zuordnung). */
  blockAssignments: Record<string, string | null | undefined>
  /** Auto-Vorschlag: PLU → block_id. */
  suggestedMap: Map<string, string>
  /** Bulk-Update: für alle Produkte die übergebene Zuordnung setzen (null = keine). */
  onBulkAssign: (assignments: Record<string, string | null>) => void
  /** Einzel-Update für manuelles Zuordnen einer Zeile. */
  onAssignOne: (plu: string, blockId: string | null) => void
  /** Verfügbare Warengruppen (für Select, bereits sortiert). */
  blocks: BackshopBlock[]
}

type FilterMode = 'all' | 'open' | 'assigned'

export function BackshopUploadGroupAssignment({
  newItems,
  blockAssignments,
  suggestedMap,
  onBulkAssign,
  onAssignOne,
  blocks,
}: BackshopUploadGroupAssignmentProps) {
  const [expanded, setExpanded] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('open')

  const resolved = useMemo(() => {
    return newItems.map((item) => {
      const explicit = blockAssignments[item.plu]
      const suggested = suggestedMap.get(item.plu) ?? null
      const current = item.block_id ?? null
      // Bevorzugung: explizit (User) > Suggestion > aktuell im Master > keine
      const effectiveBlockId =
        explicit !== undefined ? explicit : suggested ?? current ?? null
      const isSuggestion = explicit == null && suggested != null
      return { item, effectiveBlockId, isSuggestion }
    })
  }, [newItems, blockAssignments, suggestedMap])

  if (newItems.length === 0) return null

  const assigned = resolved.filter((r) => r.effectiveBlockId != null && r.effectiveBlockId !== '').length
  const unassigned = newItems.length - assigned
  const suggestableUnassigned = resolved.filter((r) => {
    const explicit = blockAssignments[r.item.plu]
    return (explicit == null || explicit === '') && suggestedMap.has(r.item.plu)
  })

  const filtered = resolved.filter((r) => {
    if (filterMode === 'all') return true
    const isAssigned = r.effectiveBlockId != null && r.effectiveBlockId !== ''
    return filterMode === 'assigned' ? isAssigned : !isAssigned
  })

  const blockNameById = new Map(blocks.map((b) => [b.id, b.name]))

  const handleAutoAssign = () => {
    const updates: Record<string, string | null> = {}
    for (const r of suggestableUnassigned) {
      const suggested = suggestedMap.get(r.item.plu)
      if (suggested) updates[r.item.plu] = suggested
    }
    onBulkAssign(updates)
  }

  const handleClearAll = () => {
    const updates: Record<string, string | null> = {}
    for (const p of newItems) updates[p.plu] = null
    onBulkAssign(updates)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-xs">
          {assigned} von {newItems.length} Produkten zugeordnet
        </Badge>
        {unassigned > 0 && (
          <span className="text-xs text-muted-foreground">
            {unassigned} noch offen
            {suggestableUnassigned.length > 0 &&
              ` – davon ${suggestableUnassigned.length} mit Auto-Vorschlag`}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAutoAssign}
          disabled={suggestableUnassigned.length === 0}
          title="Wendet den Auto-Vorschlag auf alle offenen Produkte an, die einen Vorschlag haben. Bereits zugeordnete Produkte bleiben unverändert."
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Offene automatisch zuordnen
          {suggestableUnassigned.length > 0 && ` (${suggestableUnassigned.length})`}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearAll}
          title="Setzt alle Produkte auf „Keine Zuordnung“ zurück."
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Alle zurücksetzen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
          )}
          {expanded ? 'Liste ausblenden' : 'Alle anzeigen & bearbeiten'}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Anzeigen:</span>
            <Button
              size="sm"
              variant={filterMode === 'open' ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setFilterMode('open')}
            >
              Nur offene ({unassigned})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'assigned' ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setFilterMode('assigned')}
            >
              Nur zugeordnete ({assigned})
            </Button>
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setFilterMode('all')}
            >
              Alle ({newItems.length})
            </Button>
          </div>

          <div className="max-h-[480px] overflow-y-auto rounded-md border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium w-[72px]">Bild</th>
                  <th className="px-3 py-2 text-left font-medium">Produkt</th>
                  <th className="px-3 py-2 text-left font-medium w-24">PLU</th>
                  <th className="px-3 py-2 text-left font-medium min-w-[200px]">Warengruppe</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ item, effectiveBlockId, isSuggestion }, idx) => (
                  <tr
                    key={item.plu}
                    className="border-b border-border even:bg-muted/30"
                    {...(idx === 0 ? { 'data-tour': 'backshop-upload-groups-first-row' } : {})}
                  >
                    <td className="px-3 py-2 align-middle">
                      <BackshopThumbnail src={item.image_url} size="md" />
                    </td>
                    <td className="px-3 py-2 break-words">
                      <div>{item.display_name ?? item.system_name}</div>
                      {isSuggestion && effectiveBlockId && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Auto-Vorschlag: {blockNameById.get(effectiveBlockId) ?? '—'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.plu}</td>
                    <td className="px-3 py-2">
                      <Select
                        value={effectiveBlockId ?? '__none__'}
                        onValueChange={(value) =>
                          onAssignOne(item.plu, value === '__none__' ? null : value)
                        }
                      >
                        <SelectTrigger className="h-8 min-w-[180px]">
                          <SelectValue placeholder="– Keine Zuordnung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">– Keine Zuordnung</SelectItem>
                          {blocks.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Keine Produkte in dieser Ansicht.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
