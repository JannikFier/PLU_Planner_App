import { describe, expect, it } from 'vitest'
import { filterPendingObstCarryover } from '@/lib/manual-supplement-carryover'
import type { MasterPLUItem } from '@/types/database'

function row(partial: Partial<MasterPLUItem> & Pick<MasterPLUItem, 'plu' | 'system_name'>): MasterPLUItem {
  return {
    id: '1',
    version_id: 'v',
    plu: partial.plu,
    system_name: partial.system_name,
    display_name: null,
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_admin_eigen: false,
    is_manually_renamed: false,
    preis: null,
    created_at: '',
    is_manual_supplement: partial.is_manual_supplement ?? true,
  }
}

describe('filterPendingObstCarryover', () => {
  it('filtert Supplemente die in der aktiven Version schon per PLU vorkommen', () => {
    const sup = [row({ plu: '40001', system_name: 'A', is_manual_supplement: true })]
    const act = [row({ plu: '40001', system_name: 'Anders', is_manual_supplement: false })]
    expect(filterPendingObstCarryover(sup, act)).toHaveLength(0)
  })

  it('filtert Supplemente die in der aktiven Version schon per Name vorkommen', () => {
    const sup = [row({ plu: '40002', system_name: 'Tomate', is_manual_supplement: true })]
    const act = [row({ plu: '99999', system_name: 'tomate', is_manual_supplement: false })]
    expect(filterPendingObstCarryover(sup, act)).toHaveLength(0)
  })

  it('behält Supplemente ohne Treffer in der aktiven Version', () => {
    const sup = [row({ plu: '40003', system_name: 'Nur Supplement', is_manual_supplement: true })]
    const act = [row({ plu: '50000', system_name: 'Anderes', is_manual_supplement: false })]
    expect(filterPendingObstCarryover(sup, act)).toHaveLength(1)
  })
})
