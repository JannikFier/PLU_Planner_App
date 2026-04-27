import { effectiveHiddenPluSet } from './hidden-visibility'

const camp = (lines: { plu: string; promo_price: number }[], union?: string[]) => ({
  kw_nummer: 10,
  jahr: 2026,
  lines,
  ...(union != null ? { allCentralPluUnion: union } : {}),
})

describe('effectiveHiddenPluSet', () => {
  it('lässt ausgeblendete PLUs durch zentrale Kampagne in der effektiven Menge wegfallen', () => {
    const raw = new Set(['111', '222'])
    expect(effectiveHiddenPluSet(raw, camp([{ plu: '111', promo_price: 1 }]))).toEqual(new Set(['222']))
  })

  it('behält Ausblendung bei zentraler PLU wenn Markt Werbung per Megafon aus hat', () => {
    const raw = new Set(['111', '222'])
    const c = camp([{ plu: '111', promo_price: 1 }])
    expect(effectiveHiddenPluSet(raw, c, new Set(['111']))).toEqual(new Set(['111', '222']))
  })

  it('ohne Kampagne bleibt die rohe Menge gleich', () => {
    const raw = new Set(['111', '222'])
    expect(effectiveHiddenPluSet(raw, null)).toEqual(raw)
    expect(effectiveHiddenPluSet(raw, undefined)).toEqual(raw)
    expect(effectiveHiddenPluSet(raw, camp([]))).toEqual(raw)
  })

  it('nutzt allCentralPluUnion wenn gesetzt (Obst: mehrere Teil-Kampagnen)', () => {
    const raw = new Set(['1', '2', '3'])
    expect(effectiveHiddenPluSet(raw, camp([{ plu: '1', promo_price: 1 }], ['1', '2']))).toEqual(new Set(['3']))
  })

  it('Union-PLU ohne merged line: mit Promo-Off weiterhin effektiv hidden wenn in rawHidden', () => {
    const raw = new Set(['2'])
    expect(effectiveHiddenPluSet(raw, camp([{ plu: '1', promo_price: 1 }], ['1', '2']), new Set(['2']))).toEqual(
      new Set(['2']),
    )
  })
})
