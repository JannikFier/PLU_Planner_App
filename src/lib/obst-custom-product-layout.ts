// Obst/Gemüse: Sichtbarkeit und Pflichtfelder für eigene Produkte aus Layout-Einstellungen (layout_settings)

import { parseBlockNameToItemType } from '@/lib/plu-helpers'
import type { LayoutSettings } from '@/types/database'
import type { ParsedCustomProductRow } from '@/types/plu'

/** Relevante Layout-Felder für Custom-Product-UI (Obst nur) */
export type ObstCustomProductLayoutInput = Pick<
  LayoutSettings,
  'display_mode' | 'sort_mode' | 'features_blocks'
>

const defaultLayout = (): ObstCustomProductLayoutInput => ({
  display_mode: 'MIXED',
  sort_mode: 'ALPHABETICAL',
  features_blocks: true,
})

/** Stück/Gewicht-Feld anzeigen und zur Pflicht machen (getrennte Darstellung). */
export function obstCustomProductShowItemTypeField(
  layout: Partial<ObstCustomProductLayoutInput> | null | undefined,
): boolean {
  const d = layout?.display_mode ?? defaultLayout().display_mode
  return d === 'SEPARATED'
}

/**
 * Warengruppen-UI (Dialoge, Liste, Block-Sortierung, DnD): nur von der Layout-Sortierung abhängig.
 * Wenn „Nach Warengruppen“ gewählt ist, reicht das – unabhängig vom separaten Feature-Schalter
 * (ältere DB-Zeilen hatten features_blocks=false und blockierten die Ansicht fälschlich).
 */
export function obstCustomProductShowBlockField(
  layout: Partial<ObstCustomProductLayoutInput> | null | undefined,
): boolean {
  const s = layout?.sort_mode ?? defaultLayout().sort_mode
  return s === 'BY_BLOCK'
}

/** Default item_type beim Speichern, wenn kein Typ gewählt wird (gemischte Liste). */
export const OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE = 'PIECE' as const

/** Kurztext für Excel-Import-Dialog (Spaltenbedeutung). */
export function obstCustomProductExcelImportHint(
  layout: Partial<ObstCustomProductLayoutInput> | null | undefined,
): string {
  const st = obstCustomProductShowItemTypeField(layout)
  const sb = obstCustomProductShowBlockField(layout)
  if (sb && st) return ' Spalte 3 = Warengruppe, Spalte 4 = Stück/Gewicht.'
  if (sb) return ' Spalte 3 = Warengruppe.'
  if (st) return ' Spalte 3 = Stück/Gewicht.'
  return ' Es werden nur PLU/Preis und Name verwendet (weitere Spalten optional).'
}

/** item_type aus Excel-Zeile + Layout; optional manueller Override aus der Vorschau. */
export function obstCustomProductItemTypeFromExcelRow(
  row: ParsedCustomProductRow,
  opts: { showItemType: boolean; showBlock: boolean; override?: 'PIECE' | 'WEIGHT' | null },
): 'PIECE' | 'WEIGHT' {
  if (!opts.showItemType) return OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE
  if (opts.override === 'PIECE' || opts.override === 'WEIGHT') return opts.override
  if (opts.showBlock && opts.showItemType) {
    return parseBlockNameToItemType(row.typColumn ?? null) ?? OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE
  }
  return parseBlockNameToItemType(row.blockNameOrType) ?? OBST_CUSTOM_PRODUCT_DEFAULT_ITEM_TYPE
}
