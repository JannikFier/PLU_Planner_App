import { effectiveHiddenPluSet } from './hidden-visibility'

describe('effectiveHiddenPluSet', () => {
  it('lässt ausgeblendete PLUs durch zentrale Kampagne in der effektiven Menge wegfallen', () => {
    const raw = new Set(['111', '222'])
    const lines = [{ plu: '111' }]
    expect(effectiveHiddenPluSet(raw, lines)).toEqual(new Set(['222']))
  })

  it('ohne Kampagne bleibt die rohe Menge gleich', () => {
    const raw = new Set(['111', '222'])
    expect(effectiveHiddenPluSet(raw, null)).toEqual(raw)
    expect(effectiveHiddenPluSet(raw, undefined)).toEqual(raw)
    expect(effectiveHiddenPluSet(raw, [])).toEqual(raw)
  })

  it('akzeptiert nur plu-Felder (wie Kampagnenzeilen)', () => {
    const raw = new Set(['1'])
    expect(effectiveHiddenPluSet(raw, [{ plu: '1' }])).toEqual(new Set())
  })
})
