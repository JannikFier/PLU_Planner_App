import { describe, it, expect } from 'vitest'
import type { BackshopMasterPLUItem } from '@/types/database'
import {
  buildMemberToGroupMap,
  classifyMemberKeysForApply,
  filterContainsPickerRows,
  filterSearchPickerRows,
  getMemberPickerRowStatus,
  memberPickerKey,
  rankSimilarPickerRows,
} from '@/lib/backshop-product-group-member-picker'

function mkItem(over: Partial<BackshopMasterPLUItem> & Pick<BackshopMasterPLUItem, 'plu' | 'system_name'>): BackshopMasterPLUItem {
  return {
    id: crypto.randomUUID(),
    version_id: 'ver-1',
    plu: over.plu,
    system_name: over.system_name,
    display_name: over.display_name ?? null,
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_manually_renamed: false,
    image_url: null,
    source: over.source ?? 'edeka',
    is_manual_supplement: false,
    created_at: new Date().toISOString(),
  }
}

describe('backshop-product-group-member-picker', () => {
  it('buildMemberToGroupMap und Status', () => {
    const target = 'g-target'
    const other = 'g-other'
    const map = buildMemberToGroupMap([
      { id: target, display_name: 'Ziel', members: [{ plu: '11111', source: 'edeka' }] },
      { id: other, display_name: 'Andere', members: [{ plu: '22222', source: 'harry' }] },
    ])
    expect(getMemberPickerRowStatus(target, '11111', 'edeka', map)).toBe('in_target')
    expect(getMemberPickerRowStatus(target, '22222', 'harry', map)).toBe('in_other_group')
    expect(getMemberPickerRowStatus(target, '99999', 'edeka', map)).toBe('free')
  })

  it('rankSimilarPickerRows: enthält Kern (Substring)', () => {
    const target = 'g1'
    const items = [
      mkItem({ plu: '10001', system_name: 'Apfelberliner', source: 'edeka' }),
      mkItem({ plu: '10002', system_name: 'Mini Apfelberliner', source: 'harry' }),
    ]
    const map = buildMemberToGroupMap([])
    const rows = rankSimilarPickerRows({
      masterItems: items,
      memberToGroup: map,
      targetGroupId: target,
      anchorText: 'Apfelberliner',
    })
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const mini = rows.find((r) => r.item.plu === '10002')
    expect(mini?.reasonCode).toBe('contains')
    expect(mini?.status).toBe('free')
  })

  it('rankSimilarPickerRows: schließt manual-Quelle aus', () => {
    const manualItem = mkItem({ plu: '10003', system_name: 'X', source: 'manual' })
    const rows = rankSimilarPickerRows({
      masterItems: [manualItem],
      memberToGroup: new Map(),
      targetGroupId: 'g1',
      anchorText: 'X',
    })
    expect(rows).toHaveLength(0)
  })

  it('filterSearchPickerRows', () => {
    const items = [mkItem({ plu: '81508', system_name: 'Apfelberliner', source: 'aryzta' })]
    const rows = filterSearchPickerRows({
      masterItems: items,
      memberToGroup: new Map(),
      targetGroupId: 'g1',
      query: '815',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].reasonCode).toBe('search_match')
  })

  it('filterContainsPickerRows (ignore case)', () => {
    const items = [mkItem({ plu: '1', system_name: 'MINI KUCHEN', source: 'edeka' })]
    const rows = filterContainsPickerRows({
      masterItems: items,
      memberToGroup: new Map(),
      targetGroupId: 'g1',
      needle: 'mini',
      ignoreCase: true,
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].reasonCode).toBe('contains_filter')
  })

  it('classifyMemberKeysForApply', () => {
    const target = 'g-target'
    const map = buildMemberToGroupMap([
      { id: target, display_name: 'Ziel', members: [{ plu: '1', source: 'edeka' }] },
      { id: 'g2', display_name: 'Alt', members: [{ plu: '2', source: 'harry' }] },
    ])
    const { toApply, skippedInTarget } = classifyMemberKeysForApply(
      [memberPickerKey('9', 'edeka'), memberPickerKey('1', 'edeka'), memberPickerKey('2', 'harry')],
      target,
      map,
    )
    expect(skippedInTarget).toContain(memberPickerKey('1', 'edeka'))
    const neu = toApply.find((t) => t.plu === '9')
    expect(neu?.kind).toBe('new')
    const mv = toApply.find((t) => t.plu === '2')
    expect(mv?.kind).toBe('move')
    expect(mv?.fromGroupId).toBe('g2')
  })
})
