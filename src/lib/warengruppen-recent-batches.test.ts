import { describe, expect, it } from 'vitest'
import type { WarengruppeRecentBatch, WarengruppeRecentLine } from '@/types/warengruppen-workbench-recent'
import { prependRecentBatch, summarizeBatchLines } from '@/lib/warengruppen-recent-batches'

function line(toLabel: string): WarengruppeRecentLine {
  return {
    id: 'x',
    beforeEffectiveBlockId: null,
    itemId: 'i',
    plu: '1',
    name: 'n',
    fromLabel: 'a',
    toLabel,
  }
}

describe('prependRecentBatch', () => {
  it('prepends and trims by maxBatches', () => {
    const b1: WarengruppeRecentBatch = { id: '1', at: 1, lines: [line('A')] }
    const b2: WarengruppeRecentBatch = { id: '2', at: 2, lines: [line('B')] }
    const next = prependRecentBatch([b1, b2], [line('C')], { maxBatches: 2 })
    expect(next).toHaveLength(2)
    expect(next[0].lines[0].toLabel).toBe('C')
    expect(next[1].id).toBe('1')
  })
})

describe('summarizeBatchLines', () => {
  it('detects uniform toLabel', () => {
    expect(summarizeBatchLines([line('X'), line('X')])).toEqual({
      kind: 'uniform',
      count: 2,
      toLabel: 'X',
    })
  })
  it('detects mixed', () => {
    expect(summarizeBatchLines([line('X'), line('Y')])).toEqual({ kind: 'mixed', count: 2 })
  })
})
