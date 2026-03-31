import { buildOfferDisplayMap, normalizeStoreDisabledPluSet } from './offer-display'
import type { OfferItem } from '@/types/database'

describe('buildOfferDisplayMap', () => {
  const campaign = {
    kw_nummer: 10,
    jahr: 2026,
    lines: [{ plu: '123', promo_price: 1.99 }],
  }

  it('setzt zentrale Werbung wenn Kampagne übergeben (Hook liefert passende Kampagne)', () => {
    const m = buildOfferDisplayMap(10, 2026, campaign, new Set(), [])
    expect(m.get('123')).toEqual({
      promoPrice: 1.99,
      source: 'central',
      centralReferencePrice: 1.99,
    })
  })

  it('zentrale Werbung unabhängig von aktueller KW in den Parametern (Merge nur über Kampagne-Objekt)', () => {
    const m = buildOfferDisplayMap(5, 2026, campaign, new Set(), [])
    expect(m.get('123')).toEqual({
      promoPrice: 1.99,
      source: 'central',
      centralReferencePrice: 1.99,
    })
  })

  it('blendet Megafon-aus-PLUs aus', () => {
    const m = buildOfferDisplayMap(10, 2026, campaign, new Set(['123']), [])
    expect(m.has('123')).toBe(false)
  })

  it('akzeptiert auch string[] (Query-Persistenz) für Megafon-aus', () => {
    const m = buildOfferDisplayMap(10, 2026, campaign, ['123'], [])
    expect(m.has('123')).toBe(false)
  })

  it('normalizeStoreDisabledPluSet: leeres Objekt nach JSON → leeres Set', () => {
    expect(normalizeStoreDisabledPluSet({}).size).toBe(0)
  })

  it('manuell wenn nicht zentral und KW aktiv', () => {
    const manual: OfferItem[] = [
      {
        id: 'x',
        plu: '999',
        store_id: 's',
        start_kw: 10,
        start_jahr: 2026,
        duration_weeks: 2,
        created_by: 'u',
        created_at: new Date().toISOString(),
        promo_price: 0.99,
        offer_source: 'manual',
      },
    ]
    const m = buildOfferDisplayMap(10, 2026, null, new Set(), manual)
    expect(m.get('999')?.source).toBe('manual')
  })
})
