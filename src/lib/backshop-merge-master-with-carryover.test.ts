import { describe, it, expect } from 'vitest'
import type { BackshopMasterPLUItem, StoreListCarryover } from '@/types/database'
import {
  mergeBackshopMasterItemsWithCarryoverForDisplay,
  buildBackshopMasterItemByKeyMap,
  backshopMasterLineKey,
} from '@/lib/backshop-merge-master-with-carryover'

const VID = '00000000-0000-4000-8000-000000000001'
const SID = '00000000-0000-4000-8000-000000000002'
const FVID = '00000000-0000-4000-8000-000000000003'

function masterItem(partial: Partial<BackshopMasterPLUItem> & Pick<BackshopMasterPLUItem, 'plu' | 'system_name'>): BackshopMasterPLUItem {
  return {
    id: partial.id ?? `m-${partial.plu}`,
    version_id: partial.version_id ?? VID,
    plu: partial.plu,
    system_name: partial.system_name,
    display_name: partial.display_name ?? null,
    status: partial.status ?? 'UNCHANGED',
    old_plu: partial.old_plu ?? null,
    warengruppe: partial.warengruppe ?? null,
    block_id: partial.block_id ?? null,
    is_manually_renamed: partial.is_manually_renamed ?? false,
    image_url: partial.image_url ?? null,
    source: partial.source ?? 'edeka',
    is_manual_supplement: partial.is_manual_supplement ?? false,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
  }
}

function carryRow(partial: Partial<StoreListCarryover> & Pick<StoreListCarryover, 'plu' | 'system_name'>): StoreListCarryover {
  return {
    id: partial.id ?? `c-${partial.plu}`,
    store_id: partial.store_id ?? SID,
    list_type: partial.list_type ?? 'backshop',
    for_version_id: partial.for_version_id ?? FVID,
    from_version_id: partial.from_version_id ?? VID,
    plu: partial.plu,
    system_name: partial.system_name,
    display_name: partial.display_name ?? null,
    item_type: partial.item_type ?? 'PIECE',
    preis: partial.preis ?? null,
    block_id: partial.block_id ?? null,
    warengruppe: partial.warengruppe ?? null,
    old_plu: partial.old_plu ?? null,
    image_url: partial.image_url ?? null,
    source: partial.source ?? 'harry',
    market_include: partial.market_include ?? true,
    updated_at: partial.updated_at ?? '2026-01-02T00:00:00Z',
    updated_by: partial.updated_by ?? null,
  }
}

describe('mergeBackshopMasterItemsWithCarryoverForDisplay', () => {
  it('gibt nur Master zurück wenn kein Carryover', () => {
    const m = [masterItem({ plu: '10001', system_name: 'A' })]
    expect(mergeBackshopMasterItemsWithCarryoverForDisplay(m, [], FVID)).toEqual(m)
  })

  it('hängt Carryover-Zeile an wenn PLU nicht im Master und market_include', () => {
    const m = [masterItem({ plu: '10001', system_name: 'A', source: 'edeka' })]
    const c = [
      carryRow({
        plu: '99999',
        system_name: 'CarryArtikel',
        source: 'harry',
        for_version_id: FVID,
        market_include: true,
      }),
    ]
    const merged = mergeBackshopMasterItemsWithCarryoverForDisplay(m, c, FVID)
    expect(merged).toHaveLength(2)
    const carry = merged.find((x) => x.plu === '99999')
    expect(carry?.system_name).toBe('CarryArtikel')
    expect(carry?.source).toBe('harry')
    expect(carry?.id.startsWith('carryover-')).toBe(true)
    expect(carry?.version_id).toBe(FVID)
  })

  it('unterdrückt Carryover wenn gleiche PLU schon im Master (beliebige Quelle)', () => {
    const m = [masterItem({ plu: '10001', system_name: 'Master', source: 'edeka' })]
    const c = [
      carryRow({
        plu: '10001',
        system_name: 'SollNicht',
        source: 'harry',
        market_include: true,
      }),
    ]
    const merged = mergeBackshopMasterItemsWithCarryoverForDisplay(m, c, FVID)
    expect(merged).toHaveLength(1)
    expect(merged[0].system_name).toBe('Master')
  })

  it('ignoriert Carryover mit market_include false (Default)', () => {
    const m: BackshopMasterPLUItem[] = []
    const c = [
      carryRow({
        plu: '77777',
        system_name: 'Aus',
        market_include: false,
      }),
    ]
    const merged = mergeBackshopMasterItemsWithCarryoverForDisplay(m, c, FVID)
    expect(merged).toHaveLength(0)
  })

  it('nimmt market_include false mit Option dennoch auf', () => {
    const m: BackshopMasterPLUItem[] = []
    const c = [
      carryRow({
        plu: '77777',
        system_name: 'MitOption',
        market_include: false,
      }),
    ]
    const merged = mergeBackshopMasterItemsWithCarryoverForDisplay(m, c, FVID, {
      marketIncludeOnly: false,
    })
    expect(merged).toHaveLength(1)
    expect(merged[0].system_name).toBe('MitOption')
  })

  it('filtert list_type obst aus Carryover-Input', () => {
    const m: BackshopMasterPLUItem[] = []
    const c = [
      carryRow({
        plu: '88888',
        system_name: 'Obst',
        list_type: 'obst',
        market_include: true,
      }),
    ]
    expect(mergeBackshopMasterItemsWithCarryoverForDisplay(m, c, FVID)).toHaveLength(0)
  })
})

describe('buildBackshopMasterItemByKeyMap / backshopMasterLineKey', () => {
  it('mappt plu|source korrekt', () => {
    const items = [
      masterItem({ plu: '1', system_name: 'E', source: 'edeka' }),
      masterItem({ plu: '1', system_name: 'H', source: 'harry', id: 'm2' }),
    ]
    const map = buildBackshopMasterItemByKeyMap(items)
    expect(map.get('1|edeka')?.system_name).toBe('E')
    expect(map.get('1|harry')?.system_name).toBe('H')
    expect(backshopMasterLineKey({ plu: '9', source: 'aryzta' })).toBe('9|aryzta')
  })
})
