// Unit-Tests für Bezeichnungsregeln (Keyword-Normalisierung)

import {
  normalizeKeywordInName,
  isAlreadyCorrect,
  nameContainsKeyword,
} from './keyword-rules'

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
    it('ist case-insensitive', () => {
      expect(nameContainsKeyword('BIO Banane', 'Bio')).toBe(true)
    })
  })
})
