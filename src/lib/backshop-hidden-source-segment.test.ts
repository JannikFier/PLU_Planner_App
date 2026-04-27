import { describe, it, expect } from 'vitest'
import { matchBackshopHiddenSourceSegment } from '@/lib/backshop-hidden-source-segment'

describe('matchBackshopHiddenSourceSegment', () => {
  it('filtert Regelzeilen nach Marke', () => {
    const row = (src: 'edeka' | 'harry') =>
      matchBackshopHiddenSourceSegment('edeka', {
        listKind: 'rule',
        rowSource: 'master',
        ruleLineSource: src,
      })
    expect(row('edeka')).toBe(true)
    expect(row('harry')).toBe(false)
  })

  it('Eigene zeigt nur Custom-Produkte in Bereich 1', () => {
    expect(
      matchBackshopHiddenSourceSegment('eigen', {
        listKind: 'manual',
        rowSource: 'custom',
        backshopSources: [],
      }),
    ).toBe(true)
    expect(
      matchBackshopHiddenSourceSegment('eigen', {
        listKind: 'manual',
        rowSource: 'master',
        backshopSources: ['edeka'],
      }),
    ).toBe(false)
  })
})
