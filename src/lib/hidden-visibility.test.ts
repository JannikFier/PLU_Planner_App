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
})
