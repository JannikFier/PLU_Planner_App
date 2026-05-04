import { describe, it, expect } from 'vitest'
import type { DisplayItem } from '@/types/plu'
import { buildBackshopKachelWarengruppeBlocks } from '@/lib/backshop-kachel-groups'

function minimalItem(partial: Partial<DisplayItem> & Pick<DisplayItem, 'plu' | 'display_name'>): DisplayItem {
  return {
    id: partial.id ?? `id-${partial.plu}`,
    plu: partial.plu,
    system_name: partial.system_name ?? partial.display_name,
    display_name: partial.display_name,
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: partial.warengruppe ?? null,
    block_id: partial.block_id ?? null,
    block_name: partial.block_name ?? null,
    preis: null,
    is_custom: partial.is_custom ?? false,
    is_manually_renamed: false,
    ...partial,
  }
}

describe('buildBackshopKachelWarengruppeBlocks', () => {
  it('nutzt block_name wenn warengruppe leer ist', () => {
    const blocks = buildBackshopKachelWarengruppeBlocks(
      [
        minimalItem({ plu: '1', display_name: 'A', warengruppe: null, block_name: 'Brot' }),
        minimalItem({ plu: '2', display_name: 'B', warengruppe: '   ', block_name: 'Snacks' }),
      ],
      { excludeOffers: false },
    )
    expect(blocks.map((b) => b.label)).toEqual(['Brot', 'Snacks'])
  })

  it('bevorzugt warengruppe vor block_name', () => {
    const blocks = buildBackshopKachelWarengruppeBlocks(
      [
        minimalItem({
          plu: '1',
          display_name: 'A',
          warengruppe: 'Aus Excel',
          block_name: 'Aus Block',
        }),
      ],
      { excludeOffers: false },
    )
    expect(blocks[0]?.label).toBe('Aus Excel')
  })

  it('faellt auf Ohne Warengruppe zurueck wenn beides fehlt', () => {
    const blocks = buildBackshopKachelWarengruppeBlocks(
      [minimalItem({ plu: '1', display_name: 'X', warengruppe: null, block_name: null })],
      { excludeOffers: false },
    )
    expect(blocks[0]?.label).toBe('Ohne Warengruppe')
  })
})
