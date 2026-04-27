import { useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useBackshopBlocks } from '@/hooks/useBackshopBlocks'
import { useBackshopProductGroups } from '@/hooks/useBackshopProductGroups'
import { useBulkApplyBackshopSourceChoice } from '@/hooks/useBackshopSourceChoices'
import {
  useBackshopSourceRulesForStore,
  useSaveBackshopSourceRule,
  useDeleteBackshopSourceRule,
} from '@/hooks/useBackshopSourceRules'
import { BACKSHOP_SOURCES, BACKSHOP_SOURCE_META, backshopSourceLabel } from '@/lib/backshop-sources'
import type { BackshopSource } from '@/types/database'
import type { Block } from '@/types/database'
import { formatError } from '@/lib/error-messages'
import { cn } from '@/lib/utils'

/**
 * Tabelle: bevorzugte Marke pro Warengruppe (Block) + Bulk auf alle Produktgruppen des Blocks.
 * Unter md: Karten statt breiter Tabelle (kein horizontales Scrollen der Seite).
 */
export function BackshopWarengruppenGrundregelnCard() {
  const { currentStoreId } = useCurrentStore()
  const { data: blocks = [] } = useBackshopBlocks()
  const { data: groups = [] } = useBackshopProductGroups()
  const { data: rules = [] } = useBackshopSourceRulesForStore(currentStoreId)

  const bulkApply = useBulkApplyBackshopSourceChoice()
  const saveRule = useSaveBackshopSourceRule()
  const deleteRule = useDeleteBackshopSourceRule()

  const ruleByBlock = useMemo(() => {
    const m = new Map<string, BackshopSource>()
    for (const r of rules) m.set(r.block_id, r.preferred_source as BackshopSource)
    return m
  }, [rules])

  const sortedBlocks = useMemo(() => [...blocks].sort((a, b) => a.order_index - b.order_index), [blocks])

  const firstRowBlockId = useMemo(() => sortedBlocks[0]?.id ?? null, [sortedBlocks])

  const applyRule = useCallback(
    (blockId: string, preferredSource: BackshopSource) => {
      saveRule.mutate(
        { blockId, preferredSource },
        {
          onSuccess: () => {
            const inBlock = groups.filter((g) => g.block_id === blockId)
            const targetEntries = groups
              .filter((g) => g.block_id === blockId)
              .filter((g) => g.members.some((m) => (m.source as BackshopSource) === preferredSource))
              .map((g) => ({ groupId: g.id, chosenSources: [preferredSource] }))
            if (targetEntries.length === 0) {
              if (inBlock.length === 0) {
                toast.success('Regel gespeichert', {
                  description:
                    'Die Listenansicht filtert trotzdem nach der bevorzugten Marke. Marken in zusammengeführten Produktgruppen kannst du in der Marken-Auswahl fein anpassen.',
                })
              } else {
                toast.success('Regel gespeichert', {
                  description: `In den Produktgruppen fehlt «${backshopSourceLabel(preferredSource)}» als Mitglied – die Warengruppen-Regel wirkt in der Liste trotzdem auf alle Artikel in dieser Warengruppe.`,
                })
              }
              return
            }
            bulkApply.mutate(targetEntries, {
              onSuccess: () => toast.success(`Regel auf ${targetEntries.length} Gruppe(n) angewendet.`),
              onError: (err) => toast.error(`Bulk fehlgeschlagen: ${formatError(err)}`),
            })
          },
          onError: (err) => toast.error(`Regel speichern fehlgeschlagen: ${formatError(err)}`),
        },
      )
    },
    [saveRule, groups, bulkApply],
  )

  const onSelectValueChange = useCallback(
    (blockId: string, v: string) => {
      if (v === '__none__') {
        deleteRule.mutate(blockId, {
          onSuccess: () => toast.success('Regel entfernt.'),
          onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
        })
      } else {
        applyRule(blockId, v as BackshopSource)
      }
    },
    [deleteRule, applyRule],
  )

  const renderSourceSelect = (b: Block, isFirstRow: boolean, triggerClassName?: string) => {
    const currentRule = ruleByBlock.get(b.id) ?? ''
    return (
      <Select value={currentRule} onValueChange={(v) => onSelectValueChange(b.id, v)}>
        <SelectTrigger
          className={cn('h-10 w-full md:h-8', triggerClassName)}
          data-tour={isFirstRow ? 'backshop-konfig-gruppenregeln-source-select' : undefined}
        >
          <SelectValue placeholder="– keine Regel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">– keine Regel</SelectItem>
          {BACKSHOP_SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {BACKSHOP_SOURCE_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const renderReapplyButton = (b: Block, isFirstRow: boolean, compact?: boolean) => {
    const currentRule = ruleByBlock.get(b.id) ?? ''
    if (!currentRule) return null
    return (
      <Button
        size="sm"
        variant="outline"
        className={cn(compact && 'h-11 min-h-[44px] w-full shrink-0')}
        onClick={() => applyRule(b.id, currentRule as BackshopSource)}
        disabled={bulkApply.isPending}
        data-tour={isFirstRow ? 'backshop-konfig-gruppenregeln-reapply-button' : undefined}
      >
        Erneut anwenden
      </Button>
    )
  }

  const emptyMessage = (
    <p className="px-1 py-4 text-center text-sm text-muted-foreground">Keine Warengruppen konfiguriert.</p>
  )

  return (
    <Card data-tour="backshop-konfig-gruppenregeln-card">
      <CardHeader>
        <CardTitle className="text-base">Grundregeln pro Warengruppe</CardTitle>
        <p className="text-xs text-muted-foreground">
          Lege pro Warengruppe eine bevorzugte Marke fest. Regel auf alle Gruppen dieser Warengruppe anwenden.
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        {sortedBlocks.length === 0 ? (
          emptyMessage
        ) : (
          <>
            <div className="hidden min-w-0 md:block md:overflow-x-auto">
              <table className="w-full text-sm" data-tour="backshop-konfig-gruppenregeln-table">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Warengruppe</th>
                    <th className="w-48 px-3 py-2 text-left font-medium">Bevorzugte Marke</th>
                    <th className="w-32 px-3 py-2 text-left font-medium">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBlocks.map((b) => {
                    const isFirstRow = b.id === firstRowBlockId
                    return (
                      <tr
                        key={b.id}
                        className="border-b even:bg-muted/20"
                        data-tour={isFirstRow ? 'backshop-konfig-gruppenregeln-first-row' : undefined}
                      >
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-3 py-2">{renderSourceSelect(b, isFirstRow)}</td>
                        <td className="px-3 py-2">{renderReapplyButton(b, isFirstRow)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="flex min-w-0 flex-col gap-3 md:hidden"
              data-testid="backshop-gruppenregeln-mobile-list"
            >
              {sortedBlocks.map((b) => {
                const isFirstRow = b.id === firstRowBlockId
                return (
                  <div
                    key={b.id}
                    className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                    data-tour={isFirstRow ? 'backshop-konfig-gruppenregeln-first-row' : undefined}
                  >
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Warengruppe</p>
                      <p className="text-sm font-semibold leading-snug">{b.name}</p>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Bevorzugte Marke</p>
                      {renderSourceSelect(b, isFirstRow)}
                    </div>
                    {renderReapplyButton(b, isFirstRow, true)}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
