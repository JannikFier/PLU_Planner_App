import { rankExitRowMatches } from './exit-offer-matching'

describe('rankExitRowMatches', () => {
  it('priorisiert exakten Artikelnamen', () => {
    const masters = [
      { plu: '1', label: 'Tomaten Rispen' },
      { plu: '2', label: 'Tomaten Cherry' },
    ]
    const r = rankExitRowMatches('Tomaten Rispen', masters)
    expect(r[0]?.plu).toBe('1')
  })

  it('liefert leeres Array ohne Master', () => {
    expect(rankExitRowMatches('Test', [])).toEqual([])
  })
})
