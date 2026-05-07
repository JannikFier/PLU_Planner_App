import { describe, it, expect } from 'vitest'
import { getBackshopRuleFilteredMasterRows } from '@/lib/backshop-visibility-diff'
import type { BackshopMasterPLUItem, Block } from '@/types/database'
import type { BackshopDisplayListInput } from '@/lib/layout-engine'

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
  } as BackshopMasterPLUItem
}

const base: Pick<
  BackshopDisplayListInput,
  'sortMode' | 'markYellowKwCount' | 'currentKwNummer' | 'currentJahr'
> = {
  sortMode: 'ALPHABETICAL',
  markYellowKwCount: 4,
  currentKwNummer: 10,
  currentJahr: 2026,
}

describe('getBackshopRuleFilteredMasterRows', () => {
  it('liefert Regel-ausgefilterte Zeilen, nicht manuell versteckte', () => {
    const masterItems: BackshopMasterPLUItem[] = [
      row({ id: '1', plu: '1', source: 'harry', block_id: 'b1' }),
      row({ id: '2', plu: '2', source: 'edeka', block_id: 'b1' }),
    ]
    const manual = new Set(['1'])
    const input: BackshopDisplayListInput = {
      ...base,
      masterItems,
      productGroupByPluSource: new Map(),
      chosenSourcesByGroup: new Map(),
      productGroupNames: new Map(),
      blockPreferredSourceByBlockId: new Map([['b1', 'harry']]),
      hiddenPLUs: new Set(),
    }
    const { ruleFilteredRows } = getBackshopRuleFilteredMasterRows(input, manual)
    const pluSources = ruleFilteredRows.map((r) => `${r.plu}|${r.source ?? 'edeka'}`)
    expect(pluSources).toContain('2|edeka')
    expect(pluSources).not.toContain('1|harry')
  })

  it('liefert visibleCustomPluSet nur für in der Liste vorkommende eigene Produkte', () => {
    const customOnly: BackshopDisplayListInput = {
      ...base,
      masterItems: [],
      blocks: [{ id: 'b1', name: 'Brot' } as Block],
      customProducts: [
        { id: 'c1', plu: '99', name: 'Eigenes Brot', image_url: '', block_id: 'b1' },
      ],
      hiddenPLUs: new Set(),
    }
    const onlyCustom = getBackshopRuleFilteredMasterRows(customOnly, new Set())
    expect(onlyCustom.visibleCustomPluSet.has('99')).toBe(true)

    const masterAndCustom: BackshopDisplayListInput = {
      ...base,
      masterItems: [row({ id: 'm1', plu: '1', source: 'harry', block_id: 'b1' })],
      blocks: [{ id: 'b1', name: 'Brot' } as Block],
      customProducts: [
        { id: 'c2', plu: '1', name: 'Eigen mit gleicher PLU', image_url: '', block_id: 'b1' },
      ],
      hiddenPLUs: new Set(),
    }
    const both = getBackshopRuleFilteredMasterRows(masterAndCustom, new Set())
    expect(both.visibleCustomPluSet.has('1')).toBe(false)
  })
})
