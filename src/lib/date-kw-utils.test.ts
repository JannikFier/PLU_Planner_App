// Unit-Tests für Kalenderwochen- und Jahr-Helfer

import {
  getKWAndYearFromDate,
  getNextFreeKW,
  versionExistsForKW,
  clampKWToUploadRange,
} from './date-kw-utils'

describe('date-kw-utils', () => {
  describe('getKWAndYearFromDate', () => {
    it('liefert ISO-KW und -Jahr für ein Datum', () => {
      // 6. Jan 2026 = Montag, KW 1 in ISO
      const d = new Date(2026, 0, 6)
      expect(getKWAndYearFromDate(d)).toEqual({ kw: 1, year: 2026 })
    })
    it('liefert konsistente Werte für Mitte Jahr', () => {
      // 15. Juli 2025 = Dienstag, KW 29
      const d = new Date(2025, 6, 15)
      const { kw, year } = getKWAndYearFromDate(d)
      expect(year).toBe(2025)
      expect(kw).toBeGreaterThanOrEqual(1)
      expect(kw).toBeLessThanOrEqual(53)
    })
  })

  describe('getNextFreeKW', () => {
    it('gibt currentKW zurück wenn keine Versionen', () => {
      expect(getNextFreeKW(5, 2026, [])).toBe(5)
      expect(getNextFreeKW(5, 2026, null)).toBe(5)
      expect(getNextFreeKW(5, 2026, undefined)).toBe(5)
    })
    it('gibt nächste freie KW wenn current belegt', () => {
      expect(getNextFreeKW(1, 2026, [{ kw_nummer: 1, jahr: 2026 }])).toBe(2)
      expect(getNextFreeKW(1, 2026, [
        { kw_nummer: 1, jahr: 2026 },
        { kw_nummer: 2, jahr: 2026 },
      ])).toBe(3)
    })
    it('ignoriert Versionen aus anderem Jahr', () => {
      expect(getNextFreeKW(1, 2026, [{ kw_nummer: 1, jahr: 2025 }])).toBe(1)
    })
    it('gibt currentKW zurück wenn alle KWs 1..53 belegt', () => {
      const allVersions = Array.from({ length: 53 }, (_, i) => ({
        kw_nummer: i + 1,
        jahr: 2026,
      }))
      expect(getNextFreeKW(1, 2026, allVersions)).toBe(1)
    })
  })

  describe('versionExistsForKW', () => {
    const versions = [
      { kw_nummer: 10, jahr: 2026 },
      { kw_nummer: 11, jahr: 2026 },
    ]

    it('gibt true wenn Version für (kw, jahr) existiert', () => {
      expect(versionExistsForKW(10, 2026, versions)).toBe(true)
      expect(versionExistsForKW(11, 2026, versions)).toBe(true)
    })
    it('gibt false wenn keine passende Version', () => {
      expect(versionExistsForKW(12, 2026, versions)).toBe(false)
      expect(versionExistsForKW(10, 2025, versions)).toBe(false)
    })
    it('gibt false bei null/undefined versions', () => {
      expect(versionExistsForKW(10, 2026, null)).toBe(false)
      expect(versionExistsForKW(10, 2026, undefined)).toBe(false)
    })
  })

  describe('clampKWToUploadRange', () => {
    it('clampt kw in erlaubten Bereich (aktuell ± 3)', () => {
      // 6. Jan 2026 = KW 1 → min=1, max=4
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 6))

      expect(clampKWToUploadRange(1)).toBe(1)
      expect(clampKWToUploadRange(4)).toBe(4)
      expect(clampKWToUploadRange(2)).toBe(2)
      expect(clampKWToUploadRange(0)).toBe(1)
      expect(clampKWToUploadRange(53)).toBe(4)

      vi.useRealTimers()
    })
  })
})
