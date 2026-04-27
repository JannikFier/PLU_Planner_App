import { describe, expect, it } from 'vitest'
import { normalizeSupplementNameKey } from '@/lib/manual-supplement-name'

describe('normalizeSupplementNameKey', () => {
  it('trimmt und kleinschreibt', () => {
    expect(normalizeSupplementNameKey('  Tomaten  ')).toBe('tomaten')
  })
})
