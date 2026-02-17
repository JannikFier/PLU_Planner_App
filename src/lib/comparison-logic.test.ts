// Unit-Tests für Vergleichs-Logik (Upload vs. aktuelle Version)

import { compareWithCurrentVersion, resolveConflicts } from './comparison-logic'
import type { MasterPLUItem } from '@/types/database'
import type { ParsedPLURow } from '@/types/plu'

const NEW_VERSION_ID = 'new-version-id'

function masterItem(overrides: Partial<MasterPLUItem> = {}): MasterPLUItem {
  return {
    id: 'item-1',
    version_id: 'v1',
    plu: '1000',
    system_name: 'Apfel',
    display_name: null,
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_admin_eigen: false,
    is_manually_renamed: false,
    preis: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function parsedRow(overrides: Partial<ParsedPLURow> = {}): ParsedPLURow {
  return {
    plu: '1000',
    systemName: 'Apfel',
    category: null,
    ...overrides,
  }
}

describe('comparison-logic', () => {
  describe('compareWithCurrentVersion', () => {
    it('erster Upload: alle incoming als UNCHANGED', () => {
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '1000', systemName: 'Apfel' })],
        itemType: 'PIECE',
        currentItems: [],
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: true,
      })
      expect(result.unchanged).toHaveLength(1)
      expect(result.unchanged[0].status).toBe('UNCHANGED')
      expect(result.pluChanged).toHaveLength(0)
      expect(result.newProducts).toHaveLength(0)
      expect(result.conflicts).toHaveLength(0)
    })

    it('gleiche PLU + gleicher Name → UNCHANGED', () => {
      const current = [masterItem({ plu: '1000', system_name: 'Apfel' })]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '1000', systemName: 'Apfel' })],
        itemType: 'PIECE',
        currentItems: current,
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.unchanged).toHaveLength(1)
      expect(result.conflicts).toHaveLength(0)
      expect(result.newProducts).toHaveLength(0)
    })

    it('gleiche PLU + anderer Name → CONFLICT', () => {
      const current = [masterItem({ plu: '1000', system_name: 'Apfel alt' })]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '1000', systemName: 'Apfel neu' })],
        itemType: 'PIECE',
        currentItems: current,
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].plu).toBe('1000')
      expect(result.conflicts[0].incomingName).toBe('Apfel neu')
      expect(result.conflicts[0].existingName).toBe('Apfel alt')
      expect(result.unchanged).toHaveLength(0)
    })

    it('Name existiert in aktueller Version mit anderer PLU → PLU_CHANGED_RED', () => {
      const current = [masterItem({ plu: '1000', system_name: 'Apfel' })]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '2000', systemName: 'Apfel' })],
        itemType: 'PIECE',
        currentItems: current,
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.pluChanged).toHaveLength(1)
      expect(result.pluChanged[0].plu).toBe('2000')
      expect(result.pluChanged[0].old_plu).toBe('1000')
      expect(result.pluChanged[0].status).toBe('PLU_CHANGED_RED')
    })

    it('Name existiert nur in früheren Versionen → PLU_CHANGED_RED', () => {
      const previous = [masterItem({ plu: '1000', system_name: 'Apfel', version_id: 'old' })]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '2000', systemName: 'Apfel' })],
        itemType: 'PIECE',
        currentItems: [],
        previousItems: previous,
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.pluChanged).toHaveLength(1)
      expect(result.pluChanged[0].old_plu).toBe('1000')
    })

    it('komplett neues Produkt → NEW_PRODUCT_YELLOW', () => {
      const current = [masterItem({ plu: '1000', system_name: 'Apfel' })]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '2000', systemName: 'Banane' })],
        itemType: 'PIECE',
        currentItems: current,
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.newProducts).toHaveLength(1)
      expect(result.newProducts[0].plu).toBe('2000')
      expect(result.newProducts[0].status).toBe('NEW_PRODUCT_YELLOW')
    })

    it('entfernte Produkte erscheinen in removed', () => {
      const current = [
        masterItem({ plu: '1000', system_name: 'Apfel' }),
        masterItem({ plu: '2000', system_name: 'Banane' }),
      ]
      const result = compareWithCurrentVersion({
        incomingRows: [parsedRow({ plu: '1000', systemName: 'Apfel' })],
        itemType: 'PIECE',
        currentItems: current,
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.removed).toHaveLength(1)
      expect(result.removed[0].plu).toBe('2000')
    })

    it('summary zählt korrekt', () => {
      const result = compareWithCurrentVersion({
        incomingRows: [
          parsedRow({ plu: '1000', systemName: 'Apfel' }),
          parsedRow({ plu: '2000', systemName: 'Banane' }),
        ],
        itemType: 'PIECE',
        currentItems: [masterItem({ plu: '1000', system_name: 'Apfel' })],
        previousItems: [],
        newVersionId: NEW_VERSION_ID,
        isFirstUpload: false,
      })
      expect(result.summary.unchanged).toBe(1)
      expect(result.summary.newProducts).toBe(1)
      expect(result.summary.total).toBe(2)
    })
  })

  describe('resolveConflicts', () => {
    it('ignore: behält existingName', () => {
      const conflicts = [
        {
          plu: '1000',
          incomingName: 'Apfel neu',
          existingName: 'Apfel alt',
          itemType: 'PIECE' as const,
          resolution: 'ignore' as const,
        },
      ]
      const resolved = resolveConflicts(conflicts, NEW_VERSION_ID)
      expect(resolved).toHaveLength(1)
      expect(resolved[0].system_name).toBe('Apfel alt')
    })

    it('replace: übernimmt incomingName', () => {
      const conflicts = [
        {
          plu: '1000',
          incomingName: 'Apfel neu',
          existingName: 'Apfel alt',
          itemType: 'PIECE' as const,
          resolution: 'replace' as const,
        },
      ]
      const resolved = resolveConflicts(conflicts, NEW_VERSION_ID)
      expect(resolved).toHaveLength(1)
      expect(resolved[0].system_name).toBe('Apfel neu')
    })

    it('ohne resolution wird existingName behalten', () => {
      const conflicts = [
        {
          plu: '1000',
          incomingName: 'Neu',
          existingName: 'Alt',
          itemType: 'PIECE' as const,
        },
      ]
      const resolved = resolveConflicts(conflicts, NEW_VERSION_ID)
      expect(resolved[0].system_name).toBe('Alt')
    })
  })
})
