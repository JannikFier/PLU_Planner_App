import { describe, expect, it } from 'vitest'
import { mergeBackshopDisplayLinesForOfferMap } from '@/lib/backshop-offer-campaign-store-merge'

describe('mergeBackshopDisplayLinesForOfferMap', () => {
  it('nimmt zentrale Zuordnungen (PLU gesetzt, nicht unassigned)', () => {
    const out = mergeBackshopDisplayLinesForOfferMap(
      [
        { id: 'a', plu: '10001', promo_price: 1.5, origin: 'excel' },
        { id: 'b', plu: null, promo_price: 2, origin: 'unassigned' },
      ],
      [],
    )
    expect(out).toEqual([{ plu: '10001', promo_price: 1.5 }])
  })

  it('ergänzt pending_custom per Markt-Auflösung', () => {
    const out = mergeBackshopDisplayLinesForOfferMap(
      [
        { id: 'line1', plu: null, promo_price: 3.33, origin: 'pending_custom' },
      ],
      [{ campaign_line_id: 'line1', plu: '40500' }],
    )
    expect(out).toEqual([{ plu: '40500', promo_price: 3.33 }])
  })

  it('Doppelte PLU: zentrale Zuordnung gewinnt, Auflösung wird übersprungen', () => {
    const out = mergeBackshopDisplayLinesForOfferMap(
      [
        { id: 'm', plu: '10001', promo_price: 1, origin: 'excel' },
        { id: 'p', plu: null, promo_price: 2, origin: 'pending_custom' },
      ],
      [{ campaign_line_id: 'p', plu: '10001' }],
    )
    expect(out).toEqual([{ plu: '10001', promo_price: 1 }])
  })

  it('zwei pending mit gleicher aufgelöster PLU: nur erste Auflösung', () => {
    const out = mergeBackshopDisplayLinesForOfferMap(
      [
        { id: 'p1', plu: null, promo_price: 1, origin: 'pending_custom' },
        { id: 'p2', plu: null, promo_price: 2, origin: 'pending_custom' },
      ],
      [
        { campaign_line_id: 'p1', plu: '50000' },
        { campaign_line_id: 'p2', plu: '50000' },
      ],
    )
    expect(out).toEqual([{ plu: '50000', promo_price: 1 }])
  })
})
