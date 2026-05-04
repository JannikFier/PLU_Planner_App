// Wiederverwendbare Review-Tabelle fuer zentrale Werbung (Upload + nachtraegliche Pflege)
// Links Excel-Herkunft (PLU + Artikel), rechts Master-PLU-Zuordnung mit Suche + "Keine Zuordnung"

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { ChevronsUpDown, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MasterPluCandidate } from '@/lib/exit-offer-matching'
import { MarkenQuellBadge } from '@/components/marken-auswahl/MarkenQuellBadge'

export type CampaignReviewRow = {
  /** Stabiler Key (id aus DB oder generierte id fuer neue Zeilen) */
  id: string
  /** 1-basierte Excel-Zeile, falls vorhanden */
  rowIndex?: number | null
  /** PLU aus Excel; null = manuell hinzugefuegt (ohne Excel-Herkunft) */
  sourcePlu: string | null
  /** Artikel-Hinweis aus Excel; null = nicht verfuegbar (manuell oder alte Kampagne) */
  sourceArtikel: string | null
  /** Excel „Art. Nr.“ / GTIN (Strichcode); optional */
  sourceArtNr?: string | null
  /** Aktuell ausgewaehlte Master-PLU; null = keine Zuordnung */
  selectedPlu: string | null
  /** Anzeige bei mehreren Kandidaten mit gleicher PLU (nach manueller Auswahl) */
  selectedMasterDisplay?: { label: string; source?: MasterPluCandidate['source'] } | null
  /** Herkunft der Zeile */
  origin: 'excel' | 'manual' | 'unassigned' | 'pending_custom'
}

/** Durchsuchbare Master-PLU-Auswahl mit „Keine Zuordnung“ und optional „Neues Produkt“ (Backshop). */
export type CampaignPluComboboxChangeExtra = {
  pendingNewProduct?: boolean
  /** Gesetzter Listen-Eintrag (wichtig bei mehreren Master-Zeilen mit gleicher PLU). */
  selectedCandidate?: MasterPluCandidate
}

export function CampaignPluCombobox({
  candidates,
  value,
  onChange,
  disabled,
  showNeuesProduktOption = false,
  pendingNewProductSelected = false,
  /** Anzeige, wenn gewählter Kandidat nicht eindeutig über PLU ermittelbar ist */
  displayOverride,
}: {
  candidates: MasterPluCandidate[]
  value: string | null
  onChange: (plu: string | null, extra?: CampaignPluComboboxChangeExtra) => void
  disabled?: boolean
  showNeuesProduktOption?: boolean
  pendingNewProductSelected?: boolean
  displayOverride?: { label: string; source?: MasterPluCandidate['source'] } | null
}) {
  const [open, setOpen] = useState(false)
  const selected =
    value && displayOverride
      ? { plu: value, label: displayOverride.label, source: displayOverride.source }
      : value
        ? candidates.find((c) => c.plu === value)
        : null

  const triggerLabel = (() => {
    if (selected && value) return `${value} – ${selected.label ?? '?'}`
    if (showNeuesProduktOption && pendingNewProductSelected) {
      return 'Neues Produkt (Markt legt PLU an)…'
    }
    return 'PLU wählen…'
  })()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full min-w-[200px] max-w-[420px] justify-between gap-2 font-normal"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selected?.source != null && (
              <MarkenQuellBadge source={selected.source} size="sm" className="shrink-0" />
            )}
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                !value && !pendingNewProductSelected && 'text-muted-foreground',
              )}
            >
              {triggerLabel}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,420px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="PLU oder Name suchen…" />
          <CommandList>
            <CommandEmpty>Kein Treffer.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null, { pendingNewProduct: false })
                  setOpen(false)
                }}
              >
                — Keine Zuordnung —
              </CommandItem>
              {showNeuesProduktOption && (
                <CommandItem
                  value="__pending_new__"
                  onSelect={() => {
                    onChange(null, { pendingNewProduct: true })
                    setOpen(false)
                  }}
                >
                  — Neues Produkt (Markt legt PLU an) —
                </CommandItem>
              )}
              {candidates.map((c, candIdx) => (
                <CommandItem
                  key={`cand-${candIdx}-${c.plu}-${c.source ?? 'none'}`}
                  value={`${c.plu} ${c.label}`}
                  onSelect={() => {
                    onChange(c.plu, { selectedCandidate: c })
                    setOpen(false)
                  }}
                >
                  <span className="flex min-w-0 w-full items-center gap-2">
                    {c.source != null && (
                      <MarkenQuellBadge source={c.source} size="sm" className="shrink-0" />
                    )}
                    <span className="font-mono text-xs shrink-0">{c.plu}</span>
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export interface CampaignReviewTableProps {
  rows: CampaignReviewRow[]
  candidates: MasterPluCandidate[]
  onChangePlu: (
    rowId: string,
    plu: string | null,
    extra?: CampaignPluComboboxChangeExtra,
  ) => void
  /** Zeile hinzufuegen (nur wenn editierbar) */
  onAddRow?: () => void
  /** Manuelle Zeile entfernen (nur manuell hinzugefuegte duerfen weg) */
  onRemoveRow?: (rowId: string) => void
  /** Optionale Preis-Spalte (Backshop: Akt. UVP / VK) */
  pricesById?: Record<string, number>
  onChangePrice?: (rowId: string, price: number) => void
  /** Optionale Erwerb-Spalte (Backshop) */
  purchasePricesById?: Record<string, number | null | undefined>
  onChangePurchasePrice?: (rowId: string, price: number | null) => void
  /** Art.-Nr./GTIN aus Excel (read-only), z. B. Backshop-Strichcode */
  showSourceArtNrColumn?: boolean
  /** Backshop: zweite feste Combobox-Option „Neues Produkt“ */
  showNeuesProduktOption?: boolean
  disabled?: boolean
  emptyMessage?: string
}

/**
 * Review-Tabelle mit Excel-Herkunft links, Master-PLU rechts.
 * Wenn onAddRow gesetzt ist, wird ein "Zeile hinzufuegen"-Button angezeigt.
 */
export function CampaignReviewTable({
  rows,
  candidates,
  onChangePlu,
  onAddRow,
  onRemoveRow,
  pricesById,
  onChangePrice,
  purchasePricesById,
  onChangePurchasePrice,
  showSourceArtNrColumn = false,
  showNeuesProduktOption = false,
  disabled,
  emptyMessage = 'Keine Zeilen vorhanden.',
}: CampaignReviewTableProps) {
  const showPriceColumn = !!(pricesById && onChangePrice)
  const showPurchaseColumn = !!(purchasePricesById && onChangePurchasePrice)

  const assignedCount = useMemo(() => rows.filter((r) => !!r.selectedPlu).length, [rows])
  const pendingNewCount = useMemo(
    () => rows.filter((r) => !r.selectedPlu && r.origin === 'pending_custom').length,
    [rows],
  )
  const archiveUnassignedCount = useMemo(
    () => rows.filter((r) => !r.selectedPlu && r.origin === 'unassigned').length,
    [rows],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{assignedCount} zugeordnet</Badge>
          {showNeuesProduktOption && pendingNewCount > 0 && (
            <Badge variant="outline">{pendingNewCount} neues Produkt (Markt)</Badge>
          )}
          {archiveUnassignedCount > 0 && (
            <Badge variant="outline">{archiveUnassignedCount} Archiv (keine Zuordnung)</Badge>
          )}
        </div>
        {onAddRow && (
          <Button type="button" variant="outline" size="sm" onClick={onAddRow} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Zeile hinzufügen
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto max-h-[min(65vh,560px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Zeile</TableHead>
                <TableHead className="w-28">PLU (Excel)</TableHead>
                <TableHead>Artikel (Excel)</TableHead>
                {showSourceArtNrColumn && (
                  <TableHead className="w-36 min-w-[9rem]">Art. Nr. (GTIN)</TableHead>
                )}
                <TableHead className="min-w-[260px]">Master-PLU (suchen &amp; wählen)</TableHead>
                {showPriceColumn && <TableHead className="w-28">VK (Akt. UVP)</TableHead>}
                {showPurchaseColumn && <TableHead className="w-28">Erwerb</TableHead>}
                {onRemoveRow && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => {
                const sourceEmpty = r.sourcePlu == null && r.sourceArtikel == null
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {r.rowIndex ?? idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.sourcePlu ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-xs break-words">
                      {r.sourceArtikel
                        ? r.sourceArtikel
                        : sourceEmpty && r.origin === 'manual'
                          ? (
                            <span className="text-xs text-muted-foreground italic">manuell hinzugefügt</span>
                          )
                          : (
                            <span className="text-xs text-muted-foreground italic">
                              (Excel nicht archiviert)
                            </span>
                          )}
                    </TableCell>
                    {showSourceArtNrColumn && (
                      <TableCell className="font-mono text-xs tabular-nums max-w-[10rem] break-all">
                        {r.sourceArtNr?.trim()
                          ? r.sourceArtNr.trim()
                          : (
                            <span className="text-muted-foreground">—</span>
                          )}
                      </TableCell>
                    )}
                    <TableCell>
                      <CampaignPluCombobox
                        candidates={candidates}
                        value={r.selectedPlu}
                        displayOverride={r.selectedMasterDisplay ?? null}
                        showNeuesProduktOption={showNeuesProduktOption}
                        pendingNewProductSelected={!r.selectedPlu && r.origin === 'pending_custom'}
                        onChange={(plu, extra) => onChangePlu(r.id, plu, extra)}
                        disabled={disabled}
                      />
                    </TableCell>
                    {showPriceColumn && (
                      <TableCell>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          value={
                            pricesById && pricesById[r.id] != null
                              ? String(pricesById[r.id])
                              : ''
                          }
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            onChangePrice?.(r.id, Number.isFinite(v) ? v : 0)
                          }}
                          disabled={disabled}
                          aria-label="VK Akt. UVP"
                        />
                      </TableCell>
                    )}
                    {showPurchaseColumn && (
                      <TableCell>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                          value={
                            purchasePricesById && purchasePricesById[r.id] != null &&
                            purchasePricesById[r.id] !== undefined
                              ? String(purchasePricesById[r.id])
                              : ''
                          }
                          onChange={(e) => {
                            const raw = e.target.value.trim()
                            if (raw === '') {
                              onChangePurchasePrice?.(r.id, null)
                              return
                            }
                            const v = parseFloat(raw)
                            onChangePurchasePrice?.(
                              r.id,
                              Number.isFinite(v) ? v : null,
                            )
                          }}
                          disabled={disabled}
                          aria-label="Erwerbspreis"
                          placeholder="—"
                        />
                      </TableCell>
                    )}
                    {onRemoveRow && (
                      <TableCell>
                        {r.origin === 'manual' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveRow(r.id)}
                            disabled={disabled}
                            title="Zeile entfernen"
                            aria-label="Zeile entfernen"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
