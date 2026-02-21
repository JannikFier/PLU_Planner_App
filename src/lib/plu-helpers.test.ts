// Unit-Tests für PLU-Helper-Funktionen

import {
  formatKWLabel,
  formatKWShort,
  formatPreisEur,
  parseBlockNameToItemType,
  PRICE_ONLY_PLU_PREFIX,
  isPriceOnlyPlu,
  getDisplayPlu,
  filterItemsBySearch,
  groupItemsByLetter,
  splitIntoColumns,
  type PLUItemBase,
} from './plu-helpers'

function baseItem(overrides: Partial<PLUItemBase> = {}): PLUItemBase {
  return {
    id: '1',
    plu: '1000',
    system_name: 'Test',
    display_name: null,
    item_type: 'PIECE',
    status: 'UNCHANGED',
    old_plu: null,
    block_id: null,
    ...overrides,
  }
}

describe('plu-helpers', () => {
  describe('formatKWLabel', () => {
    it('formatiert KW und Jahr mit führender Null', () => {
      expect(formatKWLabel(7, 2026)).toBe('KW07/2026')
      expect(formatKWLabel(1, 2025)).toBe('KW01/2025')
    })
    it('formatiert zweistellige KW', () => {
      expect(formatKWLabel(53, 2024)).toBe('KW53/2024')
    })
  })

  describe('formatKWShort', () => {
    it('formatiert KW ohne Jahr mit führender Null', () => {
      expect(formatKWShort(7)).toBe('KW07')
      expect(formatKWShort(1)).toBe('KW01')
    })
    it('formatiert zweistellige KW', () => {
      expect(formatKWShort(53)).toBe('KW53')
    })
  })

  describe('formatPreisEur', () => {
    it('formatiert Preis mit Komma und Euro', () => {
      expect(formatPreisEur(1.5)).toBe('1,50 €')
      expect(formatPreisEur(0)).toBe('0,00 €')
    })
    it('rundet auf zwei Nachkommastellen', () => {
      expect(formatPreisEur(2.999)).toBe('3,00 €')
    })
  })

  describe('parseBlockNameToItemType', () => {
    it('erkennt Gewicht', () => {
      expect(parseBlockNameToItemType('Gewicht')).toBe('WEIGHT')
      expect(parseBlockNameToItemType('  gewicht  ')).toBe('WEIGHT')
      expect(parseBlockNameToItemType('Obst Gewicht')).toBe('WEIGHT')
    })
    it('erkennt Stück', () => {
      expect(parseBlockNameToItemType('Stück')).toBe('PIECE')
      expect(parseBlockNameToItemType('stueck')).toBe('PIECE')
    })
    it('gibt null bei leerem oder unbekanntem Text', () => {
      expect(parseBlockNameToItemType(null)).toBe(null)
      expect(parseBlockNameToItemType('')).toBe(null)
      expect(parseBlockNameToItemType('   ')).toBe(null)
      expect(parseBlockNameToItemType('Sonstiges')).toBe(null)
    })
  })

  describe('isPriceOnlyPlu / getDisplayPlu', () => {
    it('erkennt price- Präfix', () => {
      expect(isPriceOnlyPlu(PRICE_ONLY_PLU_PREFIX + 'abc')).toBe(true)
      expect(isPriceOnlyPlu('price-uuid-123')).toBe(true)
    })
    it('normale PLU nicht als Preis-only', () => {
      expect(isPriceOnlyPlu('1000')).toBe(false)
      expect(isPriceOnlyPlu('price')).toBe(false)
    })
    it('getDisplayPlu zeigt – bei Preis-only, sonst PLU', () => {
      expect(getDisplayPlu(PRICE_ONLY_PLU_PREFIX + 'x')).toBe('–')
      expect(getDisplayPlu('1000')).toBe('1000')
    })
  })

  describe('filterItemsBySearch', () => {
    const items = [
      { plu: '1000', display_name: 'Apfel', system_name: 'Apfel' },
      { plu: '2000', display_name: 'Banane', system_name: 'Banane' },
      { plu: '3000', display_name: 'Birne', system_name: null },
    ]

    it('filtert nach PLU', () => {
      expect(filterItemsBySearch(items, '1000')).toHaveLength(1)
      expect(filterItemsBySearch(items, '1000')[0].plu).toBe('1000')
    })
    it('filtert nach display_name (case-insensitive)', () => {
      expect(filterItemsBySearch(items, 'banane')).toHaveLength(1)
      expect(filterItemsBySearch(items, 'BANANE')).toHaveLength(1)
    })
    it('filtert nach system_name', () => {
      expect(filterItemsBySearch(items, 'Apfel')).toHaveLength(1)
    })
    it('gibt alle Items bei leerem Suchtext (kein Filter)', () => {
      expect(filterItemsBySearch(items, '')).toEqual(items)
      expect(filterItemsBySearch(items, '   ')).toEqual(items)
    })
    it('Teilstring-Treffer', () => {
      expect(filterItemsBySearch(items, 'apf')).toHaveLength(1)
    })
  })

  describe('groupItemsByLetter', () => {
    it('gruppiert nach Anfangsbuchstabe', () => {
      const items = [
        baseItem({ system_name: 'Apfel', display_name: 'Apfel' }),
        baseItem({ system_name: 'Banane', display_name: 'Banane' }),
        baseItem({ system_name: 'Ananas', display_name: 'Ananas' }),
      ]
      const groups = groupItemsByLetter(items)
      expect(groups).toHaveLength(2)
      const a = groups.find((g) => g.letter === 'A')
      const b = groups.find((g) => g.letter === 'B')
      expect(a?.items).toHaveLength(2)
      expect(b?.items).toHaveLength(1)
    })
    it('ordnet Ä wie A zu', () => {
      const items = [
        baseItem({ system_name: 'Äpfel', display_name: 'Äpfel' }),
        baseItem({ system_name: 'Apfel', display_name: 'Apfel' }),
      ]
      const groups = groupItemsByLetter(items)
      expect(groups).toHaveLength(1)
      expect(groups[0].letter).toBe('A')
      expect(groups[0].items).toHaveLength(2)
    })
    it('sortiert Gruppen alphabetisch', () => {
      const items = [
        baseItem({ system_name: 'Zebra', display_name: 'Zebra' }),
        baseItem({ system_name: 'Apfel', display_name: 'Apfel' }),
      ]
      const groups = groupItemsByLetter(items)
      expect(groups[0].letter).toBe('A')
      expect(groups[1].letter).toBe('Z')
    })
  })

  describe('splitIntoColumns', () => {
    it('verteilt 5 Items auf 2 Spalten', () => {
      const items = [1, 2, 3, 4, 5]
      const cols = splitIntoColumns(items, 2)
      expect(cols).toHaveLength(2)
      expect(cols[0]).toHaveLength(3)
      expect(cols[1]).toHaveLength(2)
      expect(cols[0]).toEqual([1, 2, 3])
      expect(cols[1]).toEqual([4, 5])
    })
    it('leeres Array liefert leere Spalten', () => {
      const cols = splitIntoColumns([], 2)
      expect(cols).toHaveLength(2)
      expect(cols[0]).toEqual([])
      expect(cols[1]).toEqual([])
    })
    it('columnCount <= 0 gibt alle Items in einer Spalte', () => {
      expect(splitIntoColumns([1, 2], 0)).toEqual([[1, 2]])
    })
  })
})
