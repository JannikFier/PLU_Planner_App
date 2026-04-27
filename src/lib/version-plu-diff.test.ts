import { describe, it, expect } from 'vitest'
import {
  masterPluItemsRemovedBetweenVersions,
  backshopMasterPluItemsRemovedBetweenVersions,
  getPreviousVersionId,
} from './version-plu-diff'
import type { BackshopMasterPLUItem, MasterPLUItem } from '@/types/database'

function obstPlu(plu: string, overrides: Partial<MasterPLUItem> = {}): MasterPLUItem {
  return {
    id: `id-${plu}`,
    version_id: 'v',
    plu,
    system_name: `name-${plu}`,
    display_name: null,
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_admin_eigen: false,
    is_manually_renamed: false,
    is_manual_supplement: false,
    preis: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function bsPlu(plu: string, overrides: Partial<BackshopMasterPLUItem> = {}): BackshopMasterPLUItem {
  return {
    id: `bs-${plu}`,
    version_id: 'v',
    plu,
    system_name: `name-${plu}`,
    display_name: null,
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_manually_renamed: false,
    is_manual_supplement: false,
    image_url: null,
    source: 'edeka',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('version-plu-diff', () => {
  describe('masterPluItemsRemovedBetweenVersions', () => {
    it('liefert PLUs aus Alt, die in Neu fehlen', () => {
      const prev = [obstPlu('1'), obstPlu('2'), obstPlu('3')]
      const next = [obstPlu('1'), obstPlu('3')]
      const removed = masterPluItemsRemovedBetweenVersions(prev, next)
      expect(removed.map((r) => r.plu)).toEqual(['2'])
    })

    it('liefert leeres Array wenn nichts entfernt wurde', () => {
      const prev = [obstPlu('a')]
      const next = [obstPlu('a'), obstPlu('b')]
      expect(masterPluItemsRemovedBetweenVersions(prev, next)).toEqual([])
    })
  })

  describe('backshopMasterPluItemsRemovedBetweenVersions', () => {
    it('gleiche PLU-Logik wie Obst', () => {
      const prev = [bsPlu('10'), bsPlu('20')]
      const next = [bsPlu('20')]
      expect(backshopMasterPluItemsRemovedBetweenVersions(prev, next).map((r) => r.plu)).toEqual(['10'])
    })
  })

  describe('getPreviousVersionId', () => {
    it('liefert den nächsten Eintrag nach der aktiven ID (absteigend sortiert)', () => {
      const sorted = [{ id: 'v-new' }, { id: 'v-old' }, { id: 'v-ancient' }]
      expect(getPreviousVersionId(sorted, 'v-new')).toBe('v-old')
      expect(getPreviousVersionId(sorted, 'v-old')).toBe('v-ancient')
    })

    it('liefert null wenn keine Vorversion oder activeId fehlt', () => {
      expect(getPreviousVersionId([{ id: 'only' }], 'only')).toBeNull()
      expect(getPreviousVersionId([], 'x')).toBeNull()
      expect(getPreviousVersionId([{ id: 'a' }, { id: 'b' }], undefined)).toBeNull()
    })

    it('liefert null wenn activeId nicht in der Liste', () => {
      expect(getPreviousVersionId([{ id: 'a' }, { id: 'b' }], 'missing')).toBeNull()
    })
  })
})
