import { describe, it, expect } from 'vitest'
import { getGroupListStatus, countByStatus, sortMemberSources } from './marken-auswahl-state'
import type { BackshopSource } from '@/types/database'

const E = 'edeka' as BackshopSource
const H = 'harry' as BackshopSource

describe('getGroupListStatus', () => {
  it('leer = offen', () => {
    expect(getGroupListStatus([E, H], [])).toBe('offen')
  })
  it('Teil', () => {
    expect(getGroupListStatus([E, H], [E])).toBe('teil')
  })
  it('alle bestätigt', () => {
    expect(getGroupListStatus([E, H], [E, H])).toBe('confirmed')
  })
})

describe('countByStatus', () => {
  it('zählt Kategorien', () => {
    const list = [
      { id: '1', mem: [E, H] as BackshopSource[], chosen: [] as BackshopSource[] | undefined },
      { id: '2', mem: [E, H] as BackshopSource[], chosen: [E, H] },
      { id: '3', mem: [E, H] as BackshopSource[], chosen: [E] },
    ]
    const c = countByStatus(list)
    expect(c.all).toBe(3)
    expect(c.offen).toBe(1)
    expect(c.confirmed).toBe(1)
    expect(c.teil).toBe(1)
  })
})

describe('sortMemberSources', () => {
  it('E vor H', () => {
    const s = sortMemberSources(new Set<BackshopSource>([H, E]))
    expect(s[0]).toBe('edeka')
  })
})
