// Unit-Tests für zentrale Utils

import { generateUUID, cn } from './utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('utils', () => {
  describe('generateUUID', () => {
    it('liefert String im UUID v4 Format', () => {
      const uuid = generateUUID()
      expect(uuid).toMatch(UUID_REGEX)
    })
    it('liefert bei jedem Aufruf andere Werte', () => {
      const a = generateUUID()
      const b = generateUUID()
      expect(a).not.toBe(b)
    })
  })

  describe('cn', () => {
    it('kombiniert Klassen', () => {
      expect(cn('a', 'b')).toBe('a b')
    })
    it('merged Tailwind-Klassen korrekt', () => {
      expect(cn('p-4', 'p-6')).toBe('p-6')
    })
  })
})
