import { describe, expect, it } from 'vitest'
import {
  filterDirectManualObstSupplements,
  mergeObstNotificationNeuRows,
  obstMasterDisplayStatus,
  backshopMasterDisplayStatus,
} from './notification-neu-tab-merge'
import type { MasterPLUItem } from '@/types/database'

function row(partial: Partial<MasterPLUItem> & { id: string; plu: string; system_name: string }): MasterPLUItem {
  return {
    version_id: 'v',
    status: 'UNCHANGED',
    is_manual_supplement: true,
    ...partial,
  } as MasterPLUItem
}

describe('notification-neu-tab-merge', () => {
  it('filterDirectManualObstSupplements: ohne Vorversion bleiben alle', () => {
    const rows = [row({ id: '1', plu: '1', system_name: 'a' })]
    expect(filterDirectManualObstSupplements(rows, null)).toEqual(rows)
  })

  it('filterDirectManualObstSupplements: PLU aus Vorversion-Menge wird ausgeschlossen', () => {
    const prev = new Set(['10'])
    const rows = [
      row({ id: 'a', plu: '10', system_name: 'carry' }),
      row({ id: 'b', plu: '20', system_name: 'direct' }),
    ]
    expect(filterDirectManualObstSupplements(rows, prev)).toEqual([rows[1]])
  })

  it('mergeObstNotificationNeuRows: dedupliziert nach id und sortiert', () => {
    const yellow = [row({ id: '1', plu: '1', system_name: 'Zebra', status: 'NEW_PRODUCT_YELLOW' })]
    const manual = [row({ id: '2', plu: '2', system_name: 'Apfel' })]
    const merged = mergeObstNotificationNeuRows(yellow, manual)
    expect(merged.map((r) => r.system_name)).toEqual(['Apfel', 'Zebra'])
  })

  it('mergeObstNotificationNeuRows: gleiche id: späterer Eintrag gewinnt', () => {
    const a = row({ id: '1', plu: '1', system_name: 'x', status: 'NEW_PRODUCT_YELLOW' })
    const b = row({ id: '1', plu: '1', system_name: 'x', status: 'UNCHANGED' })
    expect(mergeObstNotificationNeuRows([a], [b])).toEqual([b])
  })

  it('obstMasterDisplayStatus: manuelles UNCHANGED ohne Vorversion → gelb', () => {
    expect(
      obstMasterDisplayStatus(
        { plu: '1', status: 'UNCHANGED', is_manual_supplement: true },
        null,
      ),
    ).toBe('NEW_PRODUCT_YELLOW')
  })

  it('obstMasterDisplayStatus: Carryover-PLU bleibt unverändert', () => {
    expect(
      obstMasterDisplayStatus(
        { plu: '10', status: 'UNCHANGED', is_manual_supplement: true },
        new Set(['10']),
      ),
    ).toBe('UNCHANGED')
  })

  it('backshopMasterDisplayStatus: manual UNCHANGED neu vs Carryover', () => {
    expect(
      backshopMasterDisplayStatus(
        { plu: '5', status: 'UNCHANGED', source: 'manual' },
        new Set(['5']),
      ),
    ).toBe('UNCHANGED')
    expect(
      backshopMasterDisplayStatus(
        { plu: '6', status: 'UNCHANGED', source: 'manual' },
        new Set(['5']),
      ),
    ).toBe('NEW_PRODUCT_YELLOW')
  })
})
