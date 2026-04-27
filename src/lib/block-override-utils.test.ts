import { describe, it, expect } from 'vitest'
import {
  normalizeSystemNameForBlockOverride,
  effectiveBlockIdForStoreOverride,
  sortBlocksWithStoreOrder,
  buildNameBlockOverrideMap,
  sanitizeEffectiveBlockId,
} from '@/lib/block-override-utils'

describe('block-override-utils', () => {
  it('normalisiert Namen konsistent', () => {
    expect(normalizeSystemNameForBlockOverride('  Apfel  ')).toBe('apfel')
  })

  it('effectiveBlockId: Override hat Vorrang vor Master', () => {
    const m = new Map([['apfel', 'block-b']])
    expect(effectiveBlockIdForStoreOverride('Apfel', 'block-a', m)).toBe('block-b')
  })

  it('effectiveBlockId: ohne Override = Master', () => {
    expect(effectiveBlockIdForStoreOverride('Birne', 'block-x', new Map())).toBe('block-x')
    expect(effectiveBlockIdForStoreOverride('Birne', null, undefined)).toBe(null)
  })

  it('buildNameBlockOverrideMap', () => {
    const m = buildNameBlockOverrideMap([{ system_name_normalized: 'x', block_id: 'b1' }])
    expect(m.get('x')).toBe('b1')
  })

  it('sortBlocksWithStoreOrder: Fallback order_index', () => {
    const blocks = [
      { id: 'a', order_index: 10, name: 'A' },
      { id: 'b', order_index: 0, name: 'B' },
    ]
    const sorted = sortBlocksWithStoreOrder(blocks, [])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('sanitizeEffectiveBlockId: unbekannte UUID → null', () => {
    const valid = new Set(['a', 'b'])
    expect(sanitizeEffectiveBlockId('a', valid)).toBe('a')
    expect(sanitizeEffectiveBlockId('ghost', valid)).toBe(null)
    expect(sanitizeEffectiveBlockId(null, valid)).toBe(null)
    expect(sanitizeEffectiveBlockId('', valid)).toBe(null)
  })

  it('sortBlocksWithStoreOrder: Markt überschreibt', () => {
    const blocks = [
      { id: 'a', order_index: 0, name: 'A' },
      { id: 'b', order_index: 1, name: 'B' },
    ]
    const sorted = sortBlocksWithStoreOrder(blocks, [
      { block_id: 'a', order_index: 5 },
      { block_id: 'b', order_index: 1 },
    ])
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a'])
  })
})
