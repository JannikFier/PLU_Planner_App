// Unit-Tests für Bezeichnungsregeln (Keyword-Normalisierung)

import {
  normalizeKeywordInName,
  isAlreadyCorrect,
  nameContainsKeyword,
  applyActiveBezeichnungsregelnToName,
  applyAllRulesToItems,
  applyAllRulesWithRenamedMerge,
} from './keyword-rules'
import type { Bezeichnungsregel, MasterPLUItem } from '@/types/database'

const bioPrefixRegel: Bezeichnungsregel = {
  id: 'test-bio',
  keyword: 'Bio',
  position: 'PREFIX',
  case_sensitive: false,
  is_active: true,
  created_at: '',
  created_by: null,
}

function minimalMasterItem(partial: Partial<MasterPLUItem> & Pick<MasterPLUItem, 'id' | 'plu' | 'system_name'>): MasterPLUItem {
  return {
    version_id: 'v1',
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    warengruppe: null,
    block_id: null,
    is_admin_eigen: false,
    preis: null,
    created_at: '',
    display_name: null,
    is_manually_renamed: false,
    ...partial,
  } as MasterPLUItem
}

describe('keyword-rules', () => {
  describe('normalizeKeywordInName', () => {
    it('setzt Keyword als PREFIX', () => {
      expect(normalizeKeywordInName('Banane Bio', 'Bio', 'PREFIX')).toBe('Bio Banane')
    })
    it('setzt Keyword als SUFFIX', () => {
      expect(normalizeKeywordInName('Banane Bio', 'Bio', 'SUFFIX')).toBe('Banane Bio')
      expect(normalizeKeywordInName('Banane', 'Bio', 'SUFFIX')).toBe('Banane Bio')
    })
    it('entfernt Keyword aus Klammern und behält Rest (PREFIX)', () => {
      const result = normalizeKeywordInName('Zitronen (Bio Demeter)', 'Bio', 'PREFIX')
      expect(result).toContain('Bio')
      expect(result).toContain('Zitronen')
      expect(result).toContain('Demeter')
    })
    it('entfernt Keyword nur als ganzes Wort (nicht in Bionda)', () => {
      expect(normalizeKeywordInName('Bionda Apfel', 'Bio', 'PREFIX')).toBe('Bio Bionda Apfel')
    })
    it('erkennt Keyword vor Komma oder Punkt (PREFIX)', () => {
      expect(normalizeKeywordInName('Banane Bio, regional', 'Bio', 'PREFIX')).toContain('Bio')
      expect(normalizeKeywordInName('Banane Bio, regional', 'Bio', 'PREFIX')).toContain('Banane')
      expect(normalizeKeywordInName('Banane Bio, regional', 'Bio', 'PREFIX')).toContain('regional')
    })
    it('erkennt Keyword vor Punkt am Ende (SUFFIX)', () => {
      expect(normalizeKeywordInName('Banane Bio.', 'Bio', 'SUFFIX')).toBe('Banane Bio.')
    })
  })

  describe('isAlreadyCorrect', () => {
    it('PREFIX: true wenn Name mit Keyword beginnt', () => {
      expect(isAlreadyCorrect('Bio Banane', 'Bio', 'PREFIX')).toBe(true)
      expect(isAlreadyCorrect('Bio (Demeter)', 'Bio', 'PREFIX')).toBe(true)
      expect(isAlreadyCorrect('Bio', 'Bio', 'PREFIX')).toBe(true)
    })
    it('PREFIX: false wenn Keyword nicht am Anfang', () => {
      expect(isAlreadyCorrect('Banane Bio', 'Bio', 'PREFIX')).toBe(false)
    })
    it('SUFFIX: true wenn Name mit Keyword endet', () => {
      expect(isAlreadyCorrect('Banane Bio', 'Bio', 'SUFFIX')).toBe(true)
      expect(isAlreadyCorrect('(Demeter) Bio', 'Bio', 'SUFFIX')).toBe(true)
      expect(isAlreadyCorrect('Banane Bio,', 'Bio', 'SUFFIX')).toBe(true)
      expect(isAlreadyCorrect('Banane Bio.', 'Bio', 'SUFFIX')).toBe(true)
    })
    it('SUFFIX: false wenn Keyword nicht am Ende', () => {
      expect(isAlreadyCorrect('Bio Banane', 'Bio', 'SUFFIX')).toBe(false)
    })
    it('ist case-insensitive', () => {
      expect(isAlreadyCorrect('BIO Banane', 'Bio', 'PREFIX')).toBe(true)
    })
  })

  describe('nameContainsKeyword', () => {
    it('trifft Keyword als ganzes Wort', () => {
      expect(nameContainsKeyword('Bio Banane', 'Bio')).toBe(true)
      expect(nameContainsKeyword('(Bio)', 'Bio')).toBe(true)
      expect(nameContainsKeyword(' Banane Bio ', 'Bio')).toBe(true)
    })
    it('trifft nicht innerhalb eines Wortes', () => {
      expect(nameContainsKeyword('Bionda', 'Bio')).toBe(false)
      expect(nameContainsKeyword('Biologie', 'Bio')).toBe(false)
    })
    it('trifft Keyword vor Komma oder Punkt', () => {
      expect(nameContainsKeyword('Banane Bio, regional', 'Bio')).toBe(true)
      expect(nameContainsKeyword('Banane Bio.', 'Bio')).toBe(true)
    })
    it('ist case-insensitive', () => {
      expect(nameContainsKeyword('BIO Banane', 'Bio')).toBe(true)
    })
  })

  describe('applyActiveBezeichnungsregelnToName', () => {
    it('wendet PREFIX-Regel auf Namen an', () => {
      expect(applyActiveBezeichnungsregelnToName('Banane Bio', [bioPrefixRegel])).toBe('Bio Banane')
    })
  })

  describe('applyAllRulesToItems', () => {
    it('normalisiert auch bei is_manually_renamed auf dem Master (Basisdisplay_name)', () => {
      const items: MasterPLUItem[] = [
        minimalMasterItem({
          id: 'i1',
          plu: '401',
          system_name: 'Speisekürbis Hokkaido',
          display_name: 'Kürbis, Hokkaido, Bio',
          is_manually_renamed: true,
        }),
      ]
      const updates = applyAllRulesToItems(items, [bioPrefixRegel])
      expect(updates).toHaveLength(1)
      expect(updates[0].display_name).toContain('Bio')
      expect(updates[0].display_name.startsWith('Bio')).toBe(true)
    })
  })

  describe('applyAllRulesWithRenamedMerge', () => {
    it('schreibt Änderungen in renamedUpdates wenn renamed_items-Zeile existiert', () => {
      const items: MasterPLUItem[] = [
        minimalMasterItem({
          id: 'i1',
          plu: '401',
          system_name: 'Speisekürbis Hokkaido',
          display_name: 'Speisekürbis Hokkaido',
          is_manually_renamed: false,
        }),
      ]
      const renamedRows = [
        {
          plu: '401',
          store_id: 'store-1',
          display_name: 'Kürbis, Hokkaido, Bio',
          is_manually_renamed: true,
        },
      ]
      const { masterUpdates, renamedUpdates } = applyAllRulesWithRenamedMerge(items, renamedRows, [bioPrefixRegel])
      expect(masterUpdates).toHaveLength(0)
      expect(renamedUpdates).toHaveLength(1)
      expect(renamedUpdates[0].plu).toBe('401')
      expect(renamedUpdates[0].store_id).toBe('store-1')
      expect(renamedUpdates[0].display_name.startsWith('Bio')).toBe(true)
    })
  })
})
