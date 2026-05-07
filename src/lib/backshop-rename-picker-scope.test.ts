import { describe, expect, it } from 'vitest'
import {
  backshopRenamePickerMastersFromDisplayOrder,
  buildBackshopMasterByIdMap,
} from '@/lib/backshop-rename-picker-scope'
import type { DisplayItem } from '@/types/plu'
import type { BackshopMasterPLUItem } from '@/types/database'

function baseDisplay(partial: Partial<DisplayItem>): DisplayItem {
  return {
    id: partial.id ?? '1',
    plu: partial.plu ?? '1',
    system_name: partial.system_name ?? 'Sys',
    display_name: partial.display_name ?? 'Disp',
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    block_name: null,
    preis: null,
    is_custom: partial.is_custom ?? false,
    is_manually_renamed: false,
    ...partial,
  }
}

function baseMaster(partial: Partial<BackshopMasterPLUItem>): BackshopMasterPLUItem {
  return {
    id: partial.id ?? 'm1',
    plu: partial.plu ?? '4011',
    system_name: partial.system_name ?? 'A',
    display_name: partial.display_name ?? 'A',
    version_id: partial.version_id ?? 'v1',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    created_at: partial.created_at ?? '',
    updated_at: partial.updated_at ?? '',
    source: partial.source ?? 'edeka',
    ...partial,
  } as BackshopMasterPLUItem
}

describe('backshop-rename-picker-scope', () => {
  it('Meine Liste: gleiche PLU, Anzeige nur Harry → genau Harry-Masterzeile', () => {
    const edeka = baseMaster({ id: 'id-edeka', plu: '12345', source: 'edeka', system_name: 'E' })
    const harry = baseMaster({ id: 'id-harry', plu: '12345', source: 'harry', system_name: 'H' })
    const display = [baseDisplay({ id: 'id-harry', plu: '12345' })]
    const out = backshopRenamePickerMastersFromDisplayOrder(display, [edeka, harry], [])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('id-harry')
    expect(out[0].source).toBe('harry')
  })

  it('Meine Liste: Reihenfolge folgt displayItems', () => {
    const a = baseMaster({ id: 'a', plu: '1' })
    const b = baseMaster({ id: 'b', plu: '2' })
    const display = [baseDisplay({ id: 'b', plu: '2' }), baseDisplay({ id: 'a', plu: '1' })]
    const out = backshopRenamePickerMastersFromDisplayOrder(display, [a, b], [])
    expect(out.map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('Meine Liste: Custom und Platzhalter werden übersprungen', () => {
    const m = baseMaster({ id: 'm1', plu: '1' })
    const display = [
      baseDisplay({ id: 'x', plu: '9', is_custom: true }),
      baseDisplay({ id: 'm1', plu: '1' }),
      baseDisplay({ id: 'ph', plu: '8', backshop_is_multi_source_placeholder: true }),
    ]
    const out = backshopRenamePickerMastersFromDisplayOrder(display, [m], [])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('m1')
  })

  it('Meine Liste: doppelte display-id nur einmal', () => {
    const m = baseMaster({ id: 'same', plu: '1' })
    const display = [baseDisplay({ id: 'same', plu: '1' }), baseDisplay({ id: 'same', plu: '1' })]
    const out = backshopRenamePickerMastersFromDisplayOrder(display, [m], [])
    expect(out).toHaveLength(1)
  })

  it('buildBackshopMasterByIdMap: Carryover ergänzt ohne Master-Id zu überschreiben', () => {
    const master = baseMaster({ id: 'uuid-1', plu: '1' })
    const carry = baseMaster({ id: 'carryover-row1', plu: '9' })
    const map = buildBackshopMasterByIdMap([master], [carry])
    expect(map.get('uuid-1')).toBe(master)
    expect(map.get('carryover-row1')).toBe(carry)
  })

  it('Meine Liste: Carryover-Zeile per display-id', () => {
    const carry = baseMaster({ id: 'carryover-abc', plu: '99999', source: 'harry' })
    const display = [baseDisplay({ id: 'carryover-abc', plu: '99999' })]
    const out = backshopRenamePickerMastersFromDisplayOrder(display, [], [carry])
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('carryover-abc')
  })
})
