// Unit-Tests für Kalenderwochen- und Jahr-Helfer

import {
  getKWAndYearFromDate,
  getBackshopWerbungAnchorDate,
  getBackshopWerbungKwYearFromDate,
  getNextFreeKW,
  versionExistsForKW,
  clampKWToUploadRange,
  weeksBetweenIsoWeeks,
  getCampaignWeekSelectOptions,
  getDefaultCampaignTargetWeek,
  getNextIsoWeekAfter,
  maxIsoWeekAmongCampaignSlots,
  pickCampaignTargetWeekFromOptions,
  formatBackshopActiveListToolbarRange,
  formatIsoWeekMondayToSaturdayDe,
  formatKwLabelWithOptionalMonSatRange,
  formatBackshopWerbungContextPlainLabel,
  getBackshopToolbarWerbungLayout,
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

  describe('getBackshopWerbungAnchorDate / getBackshopWerbungKwYearFromDate', () => {
    it('Samstag vor 23:59: Anker = jetzt (gleiche ISO-KW wie getKWAndYearFromDate)', () => {
      const d = new Date(2026, 3, 18, 23, 58, 0, 0)
      expect(getBackshopWerbungAnchorDate(d).getTime()).toBe(d.getTime())
      expect(getBackshopWerbungKwYearFromDate(d)).toEqual(getKWAndYearFromDate(d))
    })
    it('Samstag ab 23:59: Anker = folgender Montag 12:00', () => {
      const d = new Date(2026, 3, 18, 23, 59, 0, 0)
      const anchor = getBackshopWerbungAnchorDate(d)
      expect(anchor.getFullYear()).toBe(2026)
      expect(anchor.getMonth()).toBe(3)
      expect(anchor.getDate()).toBe(20)
      expect(anchor.getHours()).toBe(12)
      expect(getBackshopWerbungKwYearFromDate(d)).toEqual(getKWAndYearFromDate(anchor))
    })
    it('Sonntag: Anker = Montag 12:00 (folgende ISO-KW ggü. Samstag davor)', () => {
      const sunday = new Date(2026, 3, 19, 10, 0, 0, 0)
      const anchor = getBackshopWerbungAnchorDate(sunday)
      expect(anchor.getDay()).toBe(1)
      expect(anchor.getDate()).toBe(20)
      expect(getBackshopWerbungKwYearFromDate(sunday)).toEqual(getKWAndYearFromDate(anchor))
    })
    it('Samstag 23:59 kurz vor Jahreswechsel: Anker im neuen Kalenderjahr', () => {
      // 30.12.2028 = Samstag; +2 Tage = 01.01.2029
      const d = new Date(2028, 11, 30, 23, 59, 0, 0)
      expect(d.getDay()).toBe(6)
      const anchor = getBackshopWerbungAnchorDate(d)
      expect(anchor.getFullYear()).toBe(2029)
      expect(anchor.getMonth()).toBe(0)
      expect(anchor.getDate()).toBe(1)
      expect(getBackshopWerbungKwYearFromDate(d)).toEqual(getKWAndYearFromDate(anchor))
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

  describe('getBackshopToolbarWerbungLayout', () => {
    it('entspricht einer Zeile bei gleichem Jahr (Bereich)', () => {
      const l = getBackshopToolbarWerbungLayout(10, 2026, 14, 2026)
      expect(l).toEqual({
        variant: 'range_same_year',
        prefixBeforeEndKw: 'KW 10 – KW ',
        endKw: 14,
        suffix: ' · 2026',
      })
    })
    it('entspricht Jahreswechsel (cross_year)', () => {
      const l = getBackshopToolbarWerbungLayout(52, 2026, 2, 2027)
      expect(l).toEqual({
        variant: 'range_cross_year',
        leftFixed: 'KW 52 · 2026 – KW ',
        endKw: 2,
        suffix: ' · 2027',
      })
    })
  })

  describe('formatBackshopWerbungContextPlainLabel', () => {
    it('zeigt Bereich Liste–Werbung wie Toolbar (PDF-Kontext)', () => {
      expect(formatBackshopWerbungContextPlainLabel(17, 2026, 18, 2026, false)).toBe('KW 17 – KW 18 · 2026')
    })
    it('zeigt eine KW wenn Einspiel und Ende gleich', () => {
      expect(formatBackshopWerbungContextPlainLabel(18, 2026, 18, 2026, false)).toBe('KW 18 · 2026')
    })
    it('ergänzt Mo–Sa zur Listen-KW wenn aktiviert', () => {
      expect(formatBackshopWerbungContextPlainLabel(17, 2026, 18, 2026, true)).toBe(
        'KW 17 – KW 18 · 2026 · 20.04.2026–25.04.2026',
      )
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
    it('liefert 7 eindeutige ISO-KW-Einträge (−2 … +4 Wochen)', () => {
      const opts = getCampaignWeekSelectOptions(new Date(2026, 2, 15))
      expect(opts).toHaveLength(7)
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

  describe('getNextIsoWeekAfter', () => {
    it('liefert KW 1/2026 nach KW 52/2025', () => {
      expect(getNextIsoWeekAfter(52, 2025)).toEqual({ kw: 1, year: 2026 })
    })
    it('liefert aufeinanderfolgende KW im gleichen Jahr', () => {
      expect(getNextIsoWeekAfter(10, 2026)).toEqual({ kw: 11, year: 2026 })
    })
  })

  describe('maxIsoWeekAmongCampaignSlots', () => {
    it('liefert null für leeres Array', () => {
      expect(maxIsoWeekAmongCampaignSlots([])).toBeNull()
    })
    it('findet Maximum bei unsortierter Liste', () => {
      expect(
        maxIsoWeekAmongCampaignSlots([
          { kw: 10, jahr: 2026 },
          { kw: 3, jahr: 2027 },
          { kw: 52, jahr: 2026 },
        ]),
      ).toEqual({ kw: 3, year: 2027 })
    })
  })

  describe('pickCampaignTargetWeekFromOptions', () => {
    const opts = [
      { kw: 18, year: 2026 },
      { kw: 19, year: 2026 },
      { kw: 20, year: 2026 },
      { kw: 21, year: 2026 },
    ]

    it('wählt exakte nächste KW nach resumeAfter', () => {
      expect(pickCampaignTargetWeekFromOptions(opts, { kw: 19, year: 2026 })).toEqual({ kw: 20, year: 2026 })
    })
    it('clampt auf früheste Option on-or-after wenn nächste KW außerhalb', () => {
      expect(pickCampaignTargetWeekFromOptions(opts, { kw: 22, year: 2026 })).toEqual({ kw: 21, year: 2026 })
    })
    it('clampt auf späteste Option wenn nächste KW nach resumeAfter über alle Optionen hinausgeht', () => {
      const early = [
        { kw: 10, year: 2026 },
        { kw: 11, year: 2026 },
      ]
      expect(pickCampaignTargetWeekFromOptions(early, { kw: 11, year: 2026 })).toEqual({ kw: 11, year: 2026 })
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
