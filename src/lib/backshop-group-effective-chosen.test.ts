import { describe, it, expect } from 'vitest'
import { resolveEffectiveChosenSourcesForGroupFilter } from '@/lib/backshop-group-effective-chosen'

describe('resolveEffectiveChosenSourcesForGroupFilter', () => {
  const mem = new Set<'edeka' | 'harry' | 'aryzta'>(['edeka', 'harry'])
  const rules = new Map([['block-b', 'harry' as const]])

  it('gibt gültige DB-Wahl zurück wenn gesetzt', () => {
    expect(
      resolveEffectiveChosenSourcesForGroupFilter(mem, ['edeka'], 'block-b', rules),
    ).toEqual(['edeka'])
  })

  it('leitet von Grundregel ab wenn DB leer und block_id + pref passen', () => {
    expect(
      resolveEffectiveChosenSourcesForGroupFilter(mem, [], 'block-b', rules),
    ).toEqual(['harry'])
    expect(resolveEffectiveChosenSourcesForGroupFilter(mem, undefined, 'block-b', rules)).toEqual([
      'harry',
    ])
  })

  it('undefined wenn keine Regel für Block', () => {
    expect(
      resolveEffectiveChosenSourcesForGroupFilter(mem, [], 'other-block', rules),
    ).toBeUndefined()
  })

  it('undefined wenn bevorzugte Quelle kein Mitglied', () => {
    const onlyEdeka = new Set<'edeka' | 'harry'>(['edeka'])
    expect(
      resolveEffectiveChosenSourcesForGroupFilter(onlyEdeka, [], 'block-b', rules),
    ).toBeUndefined()
  })

  it('undefined wenn group kein block_id', () => {
    expect(resolveEffectiveChosenSourcesForGroupFilter(mem, [], null, rules)).toBeUndefined()
    expect(resolveEffectiveChosenSourcesForGroupFilter(mem, [], undefined, rules)).toBeUndefined()
  })
})
