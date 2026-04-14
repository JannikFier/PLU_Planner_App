// Unit-Tests für Kalenderwochen- und Jahr-Helfer

import {
  getKWAndYearFromDate,
  getNextFreeKW,
  versionExistsForKW,
  clampKWToUploadRange,
  weeksBetweenIsoWeeks,
  getCampaignWeekSelectOptions,
  getDefaultCampaignTargetWeek,
  formatBackshopActiveListToolbarRange,
  formatIsoWeekMondayToSaturdayDe,
  formatKwLabelWithOptionalMonSatRange,
} from './date-kw-utils'

describe('date-kw-utils', () => {
  describe('getKWAndYearFromDate', () => {
    it('liefert ISO-KW und -Jahr für ein Datum', () => {
      // 6. Jan 2026 = Dienstag, ISO-KW 2 in 2026
      const d = new Date(2026, 0, 6)
      expect(getKWAndYearFromDate(d)).toEqual({ kw: 2, year: 2026 })
    })
    it('liefert ISO-KW 14 für 31.03.2026 (Regression: nicht getWeek-Abweichung)', () => {
      const d = new Date(2026, 2, 31)
      expect(getKWAndYearFromDate(d)).toEqual({ kw: 14, year: 2026 })
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

  describe('formatIsoWeekMondayToSaturdayDe / formatKwLabelWithOptionalMonSatRange', () => {
    it('formatiert Mo–Sa für ISO-KW 7/2026', () => {
      expect(formatIsoWeekMondayToSaturdayDe(7, 2026)).toBe('09.02.2026–14.02.2026')
    })
    it('ergänzt kw_label nur wenn aktiviert', () => {
      expect(formatKwLabelWithOptionalMonSatRange('KW07/2026', 7, 2026, false)).toBe('KW07/2026')
      expect(formatKwLabelWithOptionalMonSatRange('KW07/2026', 7, 2026, true)).toBe(
        'KW07/2026 · 09.02.2026–14.02.2026',
      )
    })
  })

  describe('formatBackshopActiveListToolbarRange', () => {
    it('zeigt eine KW wenn Einspiel und heute dieselbe ISO-KW sind', () => {
      expect(formatBackshopActiveListToolbarRange(10, 2026, 10, 2026)).toBe('KW 10 · 2026')
    })
    it('zeigt Bereich im gleichen Jahr', () => {
      expect(formatBackshopActiveListToolbarRange(10, 2026, 14, 2026)).toBe('KW 10 – KW 14 · 2026')
    })
    it('zeigt Bereich über Jahreswechsel mit vollem Jahr je Seite', () => {
      expect(formatBackshopActiveListToolbarRange(52, 2026, 2, 2027)).toBe(
        'KW 52 · 2026 – KW 2 · 2027',
      )
    })
    it('zeigt nur Einspiel-KW wenn „heute“ vor Montag der Einspiel-Woche liegt', () => {
      // Einspiel KW 5/2026, „heute“ KW 2/2026 → nur Liste
      expect(formatBackshopActiveListToolbarRange(5, 2026, 2, 2026)).toBe('KW 5 · 2026')
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

  describe('getCampaignWeekSelectOptions', () => {
    it('liefert bis zu 5 eindeutige ISO-KW-Einträge (±2 Wochen)', () => {
      const opts = getCampaignWeekSelectOptions(new Date(2026, 2, 15))
      expect(opts.length).toBeGreaterThanOrEqual(3)
      expect(opts.length).toBeLessThanOrEqual(5)
      expect(opts[0]).toMatchObject({ kw: expect.any(Number), year: expect.any(Number), label: expect.any(String) })
    })
  })

  describe('getDefaultCampaignTargetWeek', () => {
    it('liefert KW/Jahr (nächste Woche relativ zu heute)', () => {
      const next = getDefaultCampaignTargetWeek()
      expect(next.kw).toBeGreaterThanOrEqual(1)
      expect(next.kw).toBeLessThanOrEqual(53)
    })
  })

  describe('weeksBetweenIsoWeeks', () => {
    it('liefert 0 für dieselbe ISO-KW', () => {
      expect(weeksBetweenIsoWeeks(10, 2026, 10, 2026)).toBe(0)
    })
    it('liefert 1 für aufeinanderfolgende KW im gleichen Jahr', () => {
      expect(weeksBetweenIsoWeeks(11, 2026, 10, 2026)).toBe(1)
    })
  })

  describe('clampKWToUploadRange', () => {
    it('clampt kw in erlaubten Bereich (aktuell ± 3)', () => {
      // 6. Jan 2026 = ISO-KW 2 → min=1, max=5
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 6))

      expect(clampKWToUploadRange(1)).toBe(1)
      expect(clampKWToUploadRange(4)).toBe(4)
      expect(clampKWToUploadRange(2)).toBe(2)
      expect(clampKWToUploadRange(0)).toBe(1)
      expect(clampKWToUploadRange(53)).toBe(5)

      vi.useRealTimers()
    })
  })
})
