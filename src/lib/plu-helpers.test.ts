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
  fuzzyOwnProductNameMatches,
  itemMatchesSearch,
  splitTextForHighlight,
  groupItemsByLetter,
  groupItemsByBlock,
  splitIntoColumns,
  formatProductWordsForDisplay,
  isLetterPluSectionHeaderLabel,
  formatPluBlockSectionHeaderForDisplay,
  type PLUItemBase,
} from './plu-helpers'
import type { Block } from '@/types/database'

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
  describe('formatPluBlockSectionHeaderForDisplay', () => {
    it('erkennt Buchstaben-Köpfe', () => {
      expect(isLetterPluSectionHeaderLabel('— A —')).toBe(true)
      expect(isLetterPluSectionHeaderLabel('Regional')).toBe(false)
    })
    it('Warengruppe: VERSAL aus DB → Satzschreibung', () => {
      expect(formatPluBlockSectionHeaderForDisplay('REGIONAL')).toBe('Regional')
      expect(formatPluBlockSectionHeaderForDisplay('TEST GRUPPE')).toBe('Test gruppe')
      expect(formatPluBlockSectionHeaderForDisplay('Regional')).toBe('Regional')
      expect(formatPluBlockSectionHeaderForDisplay('— B —')).toBe('— B —')
      expect(formatPluBlockSectionHeaderForDisplay('Ohne Zuordnung')).toBe('Ohne Zuordnung')
    })
  })

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

  describe('formatProductWordsForDisplay', () => {
    it('setzt pro Wort erste Buchstabe groß (de)', () => {
      expect(formatProductWordsForDisplay('Kiwi gold jumbo')).toBe('Kiwi Gold Jumbo')
    })
    it('normalisiert Mehrfach-Leerzeichen', () => {
      expect(formatProductWordsForDisplay('a  b')).toBe('A B')
    })
    it('trimmt und leerer String', () => {
      expect(formatProductWordsForDisplay('  x  ')).toBe('X')
      expect(formatProductWordsForDisplay('')).toBe('')
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
    it('fuzzyOwnProductNameMatches: sparge trifft Spagel (Tippfehler)', () => {
      expect(fuzzyOwnProductNameMatches('spagel weiß kallen', 'sparge')).toBe(true)
      expect(fuzzyOwnProductNameMatches('banane', 'sparge')).toBe(false)
    })
    it('itemMatchesSearch mit searchFuzzyName für eigenes Produkt', () => {
      expect(
        itemMatchesSearch(
          {
            plu: '41844',
            display_name: 'Spagel weiß Kallen',
            system_name: 'Spagel weiß Kallen',
            searchFuzzyName: true,
          },
          'sparge',
        ),
      ).toBe(true)
      expect(
        itemMatchesSearch(
          { plu: '41844', display_name: 'Spagel weiß Kallen', searchFuzzyName: false },
          'sparge',
        ),
      ).toBe(false)
    })
    it('findet Treffer über searchHaystack wenn nicht in Namen', () => {
      const withHay = [
        {
          plu: '41511',
          display_name: 'Spargel weiß Edeka',
          system_name: 'Spargel weiß Edeka',
          searchHaystack: 'Regionale Spargeln vom Hof',
        },
      ]
      expect(filterItemsBySearch(withHay, 'Regionale')).toHaveLength(1)
      expect(filterItemsBySearch(withHay, 'spargeln')).toHaveLength(1)
      expect(filterItemsBySearch(withHay, 'unbekanntxyz')).toHaveLength(0)
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

  describe('groupItemsByBlock', () => {
    const mkBlock = (id: string, name: string, order_index: number): Block =>
      ({ id, name, order_index, created_at: '2020-01-01T00:00:00.000Z' }) as Block

    it('includeEmptyBlocks: leere Warengruppe erscheint mit leerer items-Liste', () => {
      const blocks = [mkBlock('b1', 'Leer', 0), mkBlock('b2', 'Mit', 1)]
      const items = [baseItem({ id: 'x', block_id: 'b2' })]
      const g = groupItemsByBlock(items, blocks, { includeEmptyBlocks: true, sortedBlocks: blocks })
      expect(g.map((x) => x.blockName)).toEqual(['Leer', 'Mit'])
      expect(g[0]!.items).toEqual([])
      expect(g[1]!.items).toHaveLength(1)
    })

    it('ohne includeEmptyBlocks: nur Gruppen mit Artikeln', () => {
      const blocks = [mkBlock('b1', 'Leer', 0), mkBlock('b2', 'Mit', 1)]
      const items = [baseItem({ id: 'x', block_id: 'b2' })]
      const g = groupItemsByBlock(items, blocks, { sortedBlocks: blocks })
      expect(g.map((x) => x.blockName)).toEqual(['Mit'])
    })
  })

  describe('splitTextForHighlight', () => {
    it('markiert Treffer case-insensitive', () => {
      expect(splitTextForHighlight('Apple BIO', 'bio')).toEqual([
        { text: 'Apple ', match: false },
        { text: 'BIO', match: true },
      ])
    })
    it('mehrere Treffer in einem String', () => {
      expect(splitTextForHighlight('aa', 'a')).toEqual([
        { text: 'a', match: true },
        { text: 'a', match: true },
      ])
    })
    it('leere Query liefert ein Segment ohne Treffer', () => {
      expect(splitTextForHighlight('x', '  ')).toEqual([{ text: 'x', match: false }])
    })
  })
})
