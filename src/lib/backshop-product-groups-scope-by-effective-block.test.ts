import { describe, expect, it } from 'vitest'
import { scopeProductGroupsByEffectiveBlock } from '@/lib/backshop-product-groups-scope-by-effective-block'
import { buildNameBlockOverrideMap } from '@/lib/block-override-utils'

const sweetBlock = 'block-sweet'
const savoryBlock = 'block-savory'

describe('scopeProductGroupsByEffectiveBlock', () => {
  it('lässt Gruppen ohne block_id unverändert', () => {
    const g = {
      id: 'g1',
      block_id: null as string | null,
      members: [{ plu: '1', source: 'edeka' }],
      resolvedItems: [
        { plu: '1', source: 'edeka', system_name: 'A', block_id: sweetBlock, display_name: null, image_url: null },
      ],
    }
    const overrides = buildNameBlockOverrideMap([
      { system_name_normalized: 'a', block_id: savoryBlock },
    ])
    const out = scopeProductGroupsByEffectiveBlock([g], overrides)
    expect(out[0]).toBe(g)
  })

  it('behält nur Mitglieder deren effektive Warengruppe der Gruppe entspricht', () => {
    const g = {
      id: 'g1',
      block_id: sweetBlock,
      members: [
        { plu: '1', source: 'edeka' },
        { plu: '2', source: 'edeka' },
      ],
      resolvedItems: [
        { plu: '1', source: 'edeka', system_name: 'Kuchen', block_id: sweetBlock },
        { plu: '2', source: 'edeka', system_name: 'Rollmops', block_id: sweetBlock },
      ],
    }
    const overrides = buildNameBlockOverrideMap([
      { system_name_normalized: 'rollmops', block_id: savoryBlock },
    ])
    const out = scopeProductGroupsByEffectiveBlock([g], overrides)
    expect(out[0]!.members).toHaveLength(1)
    expect(out[0]!.members[0]!.plu).toBe('1')
    expect(out[0]!.resolvedItems).toHaveLength(1)
    expect(out[0]!.resolvedItems[0]!.plu).toBe('1')
  })

  it('ohne Overrides zählt nur Master-block_id', () => {
    const g = {
      id: 'g1',
      block_id: sweetBlock,
      members: [
        { plu: '1', source: 'edeka' },
        { plu: '2', source: 'edeka' },
      ],
      resolvedItems: [
        { plu: '1', source: 'edeka', system_name: 'A', block_id: sweetBlock },
        { plu: '2', source: 'edeka', system_name: 'B', block_id: savoryBlock },
      ],
    }
    const out = scopeProductGroupsByEffectiveBlock([g], undefined)
    expect(out[0]!.members).toHaveLength(1)
    expect(out[0]!.members[0]!.plu).toBe('1')
  })
})
