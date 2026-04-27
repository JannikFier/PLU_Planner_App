import { describe, it, expect } from 'vitest'
import { buildBackshopDisplayList } from '@/lib/layout-engine'
import type { BackshopMasterPLUItem } from '@/types/database'
import type { OfferDisplayInfo } from '@/lib/offer-display'

function row(
  partial: Pick<BackshopMasterPLUItem, 'id' | 'plu' | 'source'> & Partial<BackshopMasterPLUItem>,
): BackshopMasterPLUItem {
  return {
    version_id: 'v',
    system_name: partial.plu,
    display_name: partial.plu,
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: 'Brot',
    block_id: 'b1',
    is_manually_renamed: false,
    image_url: null,
    is_manual_supplement: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('buildBackshopDisplayList multi-source + Angebote', () => {
  const baseInput = {
    sortMode: 'ALPHABETICAL' as const,
    markYellowKwCount: 4,
    currentKwNummer: 10,
    currentJahr: 2026,
  }

  it('behält nur gewählte Marke wenn kein Angebot (Teilmenge) + Hint', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry' }),
      row({ id: '2', plu: '1002', source: 'edeka' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1002|edeka', 'g1'],
    ])
    const chosenSourcesByGroup = new Map([['g1', ['harry' as const]]])
    const productGroupNames = new Map([['g1', 'Brot Misch']])

    const { items, stats } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup,
      productGroupNames,
    })

    expect(items.map((i) => i.plu)).toEqual(['1001'])
    expect(stats.total).toBe(1)
    expect(stats.unresolvedGroupCount).toBe(0)
    expect(items[0].backshop_tinder_group_id).toBe('g1')
    expect(items[0].backshop_other_group_sources_count).toBe(1)
  })

  it('ohne Marken-Wahl: alle Quellen sichtbar, kein Konflikt-Zähler', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry' }),
      row({ id: '2', plu: '1002', source: 'edeka' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1002|edeka', 'g1'],
    ])
    const productGroupNames = new Map([['g1', 'Brot Misch']])

    const { items, stats } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      productGroupNames,
    })

    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1001')).toBe(true)
    expect(plus.has('1002')).toBe(true)
    expect(items.every((i) => !i.backshop_is_multi_source_placeholder)).toBe(true)
    expect(stats.unresolvedGroupCount).toBe(0)
  })

  it('ohne DB-Marken-Wahl aber Warengruppen-Grundregel: Produktgruppe nur bevorzugte Quelle', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'b1' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'b1' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1002|edeka', 'g1'],
    ])
    const productGroupNames = new Map([['g1', 'Brot Misch']])
    const groupBlockIdByGroupId = new Map([['g1', 'b1']])
    const blockPreferredSourceByBlockId = new Map([['b1', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup: new Map(),
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
    })

    expect(items.map((i) => i.plu)).toEqual(['1001'])
  })

  it('Gruppe nur mit Edeka-Member aber Block-Grundregel Harry: Zeilen ausgeblendet außer Angebot', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '9001', source: 'edeka', block_id: 'b1' }),
      row({ id: '2', plu: '9002', source: 'edeka', block_id: 'b1' }),
    ]
    const productGroupByPluSource = new Map([
      ['9001|edeka', 'g-only-e'],
      ['9002|edeka', 'g-only-e'],
    ])
    const productGroupNames = new Map([['g-only-e', 'Nur Edeka Gruppe']])
    const groupBlockIdByGroupId = new Map([['g-only-e', 'b1']])
    const blockPreferredSourceByBlockId = new Map([['b1', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup: new Map(),
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
    })

    expect(items.map((i) => i.plu)).toEqual([])
  })

  it('Grundregel-Fallback: Edeka-Zeile bleibt bei Angebot in offerDisplayByPlu', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'b1' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'b1' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1002|edeka', 'g1'],
    ])
    const productGroupNames = new Map([['g1', 'Brot Misch']])
    const groupBlockIdByGroupId = new Map([['g1', 'b1']])
    const blockPreferredSourceByBlockId = new Map([['b1', 'harry' as const]])
    const offerDisplayByPlu = new Map<string, OfferDisplayInfo>([
      ['1002', { promoPrice: 0.99, source: 'central' }],
    ])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup: new Map(),
      productGroupNames,
      blockPreferredSourceByBlockId,
      groupBlockIdByGroupId,
      offerDisplayByPlu,
    })

    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1001')).toBe(true)
    expect(plus.has('1002')).toBe(true)
  })

  it('blendet Edeka trotz Harry-Regel ein wenn PLU in offerDisplayByPlu (zentral)', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry' }),
      row({ id: '2', plu: '1002', source: 'edeka' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1002|edeka', 'g1'],
    ])
    const chosenSourcesByGroup = new Map([['g1', ['harry' as const]]])
    const productGroupNames = new Map([['g1', 'Brot Misch']])
    const offerDisplayByPlu = new Map<string, OfferDisplayInfo>([
      ['1002', { promoPrice: 0.99, source: 'central' }],
    ])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup,
      productGroupNames,
      offerDisplayByPlu,
    })

    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1001')).toBe(true)
    expect(plus.has('1002')).toBe(true)
  })

  it('filtert ungruppierte Master-Zeilen nach Block-Regel (ohne Product-Group-Map-Treffer)', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'block-b' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'block-b' }),
    ]
    const productGroupByPluSource = new Map<string, string>()
    const chosenSourcesByGroup = new Map([['g-unused', ['harry' as const]]])
    const productGroupNames = new Map([['g-unused', 'X']])
    const blockPreferredSourceByBlockId = new Map([['block-b', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup,
      productGroupNames,
      blockPreferredSourceByBlockId,
    })
    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1001')).toBe(true)
    expect(plus.has('1002')).toBe(false)
  })

  it('blendet andere Marke ein bei manuellem Angebot in offerDisplayByPlu', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry' }),
      row({ id: '3', plu: '1003', source: 'aryzta' }),
    ]
    const productGroupByPluSource = new Map([
      ['1001|harry', 'g1'],
      ['1003|aryzta', 'g1'],
    ])
    const chosenSourcesByGroup = new Map([['g1', ['harry' as const]]])
    const productGroupNames = new Map([['g1', 'Brot Misch']])
    const offerDisplayByPlu = new Map<string, OfferDisplayInfo>([
      ['1003', { promoPrice: 1.5, source: 'manual' }],
    ])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      chosenSourcesByGroup,
      productGroupNames,
      offerDisplayByPlu,
    })

    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1001')).toBe(true)
    expect(plus.has('1003')).toBe(true)
  })
})

describe('buildBackshopDisplayList line visibility overrides', () => {
  const baseInput = {
    sortMode: 'ALPHABETICAL' as const,
    markYellowKwCount: 4,
    currentKwNummer: 10,
    currentJahr: 2026,
  }

  it('force_show blendet Master-Zeile trotz Block-Regel ein', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'block-b' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'block-b' }),
    ]
    const productGroupByPluSource = new Map<string, string>()
    const blockPreferredSourceByBlockId = new Map([['block-b', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      productGroupNames: new Map(),
      chosenSourcesByGroup: new Map(),
      blockPreferredSourceByBlockId,
      lineForceShowKeys: new Set(['1002|edeka']),
    })

    const keys = items.filter((i) => !i.is_custom).map((i) => `${i.plu}|${i.backshop_source ?? 'edeka'}`)
    expect(keys).toContain('1001|harry')
    expect(keys).toContain('1002|edeka')
  })

  it('force_show respektiert hiddenPLUs', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'block-b' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'block-b' }),
    ]
    const productGroupByPluSource = new Map<string, string>()
    const blockPreferredSourceByBlockId = new Map([['block-b', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      productGroupNames: new Map(),
      chosenSourcesByGroup: new Map(),
      blockPreferredSourceByBlockId,
      hiddenPLUs: new Set(['1002']),
      lineForceShowKeys: new Set(['1002|edeka']),
    })

    const plus = new Set(items.map((i) => i.plu))
    expect(plus.has('1002')).toBe(false)
    expect(plus.has('1001')).toBe(true)
  })

  it('force_hide entfernt Master-Zeile trotz sonstiger Sichtbarkeit', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1001', source: 'harry', block_id: 'block-b' }),
      row({ id: '2', plu: '1002', source: 'edeka', block_id: 'block-b' }),
    ]
    const productGroupByPluSource = new Map<string, string>()
    const blockPreferredSourceByBlockId = new Map([['block-b', 'harry' as const]])

    const { items } = buildBackshopDisplayList({
      ...baseInput,
      masterItems,
      productGroupByPluSource,
      productGroupNames: new Map(),
      chosenSourcesByGroup: new Map(),
      blockPreferredSourceByBlockId,
      lineForceHideKeys: new Set(['1001|harry']),
    })

    const keys = items.filter((i) => !i.is_custom).map((i) => `${i.plu}|${i.backshop_source ?? 'edeka'}`)
    expect(keys).not.toContain('1001|harry')
  })
})
