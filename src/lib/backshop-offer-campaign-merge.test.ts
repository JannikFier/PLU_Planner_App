import { describe, expect, it } from 'vitest'
import {
  buildSourceArtNrMapFromLines,
  mergeSourceArtNrFromPreviousCampaign,
} from '@/lib/backshop-offer-campaign-merge'

describe('buildSourceArtNrMapFromLines', () => {
  it('ignoriert leere PLU und leere Art.-Nr.', () => {
    expect(
      buildSourceArtNrMapFromLines([
        { plu: null, source_art_nr: '4012345678901' },
        { plu: '82015', source_art_nr: null },
        { plu: '82015', source_art_nr: '   ' },
      ]).size,
    ).toBe(0)
  })

  it('pro PLU letzte nicht-leere Art.-Nr.', () => {
    const m = buildSourceArtNrMapFromLines([
      { plu: '1', source_art_nr: '111' },
      { plu: '1', source_art_nr: '222' },
    ])
    expect(m.get('1')).toBe('222')
  })
})

describe('mergeSourceArtNrFromPreviousCampaign', () => {
  it('übernimmt Vorläufer wenn Import keine Art.-Nr. hat', () => {
    const prev = new Map([['82015', '4012345678901']])
    const out = mergeSourceArtNrFromPreviousCampaign(
      [
        { plu: '82015', promo_price: 1, source_art_nr: null },
        { plu: '99999', promo_price: 2, source_art_nr: null },
      ],
      prev,
    )
    expect(out[0].source_art_nr).toBe('4012345678901')
    expect(out[1].source_art_nr).toBeNull()
  })

  it('bevorzugt neu importierte Art.-Nr.', () => {
    const prev = new Map([['82015', 'OLD']])
    const out = mergeSourceArtNrFromPreviousCampaign(
      [{ plu: '82015', promo_price: 1, source_art_nr: 'NEW' }],
      prev,
    )
    expect(out[0].source_art_nr).toBe('NEW')
  })

  it('trimmt eingehende Art.-Nr. zur Gewinn-Entscheidung', () => {
    const prev = new Map([['82015', 'OLD']])
    const out = mergeSourceArtNrFromPreviousCampaign(
      [{ plu: '82015', promo_price: 1, source_art_nr: '  4011111111111  ' }],
      prev,
    )
    expect(out[0].source_art_nr).toBe('  4011111111111  ')
  })
})
