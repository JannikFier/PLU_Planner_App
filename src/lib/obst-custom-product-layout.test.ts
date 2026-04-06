import { describe, it, expect } from 'vitest'
import {
  obstCustomProductShowItemTypeField,
  obstCustomProductShowBlockField,
  obstCustomProductExcelImportHint,
  obstCustomProductItemTypeFromExcelRow,
} from '@/lib/obst-custom-product-layout'

describe('obst-custom-product-layout', () => {
  it('Typ-Feld nur bei SEPARATED', () => {
    expect(obstCustomProductShowItemTypeField({ display_mode: 'SEPARATED', sort_mode: 'ALPHABETICAL' })).toBe(true)
    expect(obstCustomProductShowItemTypeField({ display_mode: 'MIXED', sort_mode: 'ALPHABETICAL' })).toBe(false)
    expect(obstCustomProductShowItemTypeField(null)).toBe(false)
  })

  it('Warengruppe nur bei Sortierung nach Warengruppen (BY_BLOCK)', () => {
    expect(
      obstCustomProductShowBlockField({ display_mode: 'MIXED', sort_mode: 'BY_BLOCK', features_blocks: true }),
    ).toBe(true)
    expect(
      obstCustomProductShowBlockField({ display_mode: 'MIXED', sort_mode: 'BY_BLOCK', features_blocks: false }),
    ).toBe(true)
    expect(obstCustomProductShowBlockField({ display_mode: 'MIXED', sort_mode: 'ALPHABETICAL' })).toBe(false)
    expect(obstCustomProductShowBlockField({ display_mode: 'MIXED', sort_mode: 'BY_BLOCK' })).toBe(true)
  })

  it('Excel-Hinweistext je Layout', () => {
    expect(obstCustomProductExcelImportHint({ display_mode: 'MIXED', sort_mode: 'ALPHABETICAL' })).toContain(
      'nur PLU',
    )
    expect(obstCustomProductExcelImportHint({ display_mode: 'SEPARATED', sort_mode: 'ALPHABETICAL' })).toContain(
      'Spalte 3',
    )
  })

  it('item_type aus Excel-Zeile', () => {
    expect(
      obstCustomProductItemTypeFromExcelRow(
        { plu: '1', preis: null, name: 'x', blockNameOrType: 'Stück', typColumn: null },
        { showItemType: false, showBlock: true },
      ),
    ).toBe('PIECE')
    expect(
      obstCustomProductItemTypeFromExcelRow(
        { plu: '1', preis: null, name: 'x', blockNameOrType: 'Obst', typColumn: 'Gewicht' },
        { showItemType: true, showBlock: true },
      ),
    ).toBe('WEIGHT')
  })
})
