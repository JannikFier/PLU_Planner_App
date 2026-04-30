import { describe, expect, it } from 'vitest'
import { parseGermanCellDateToIso } from '@/lib/excel-parser'

describe('parseGermanCellDateToIso', () => {
  it('parst DD.MM.YY', () => {
    expect(parseGermanCellDateToIso('06.05.26')).toBe('2026-05-06')
  })
  it('parst DD.MM.YYYY', () => {
    expect(parseGermanCellDateToIso('06.05.2026')).toBe('2026-05-06')
  })
})
