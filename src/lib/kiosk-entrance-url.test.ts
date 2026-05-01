import { describe, expect, it } from 'vitest'
import {
  buildKioskEntranceUrl,
  isKioskEntranceUrlMisdeployedForHostname,
  kioskUrlSharesOriginWithPage,
} from '@/lib/kiosk-entrance-url'

describe('buildKioskEntranceUrl', () => {
  it('nutzt Markt-Host bei gueltiger Subdomain', () => {
    const r = buildKioskEntranceUrl({
      token: 'abc-def',
      storeSubdomain: 'angerbogen',
      appDomain: 'example.com',
      currentOrigin: 'https://app.example.com',
    })
    expect(r.usedSubdomainHost).toBe(true)
    expect(r.url).toBe('https://angerbogen.example.com/kasse/abc-def')
  })

  it('akzeptiert appDomain mit versehentlichem https-Prefix', () => {
    const r = buildKioskEntranceUrl({
      token: 'tok',
      storeSubdomain: 'angerbogen',
      appDomain: 'https://fier-hub.de/',
      currentOrigin: 'https://www.fier-hub.de',
    })
    expect(r.usedSubdomainHost).toBe(true)
    expect(r.url).toBe('https://angerbogen.fier-hub.de/kasse/tok')
  })

  it('localhost: uebernimmt Dev-Port von currentOrigin (Vite)', () => {
    const r = buildKioskEntranceUrl({
      token: 'tok',
      storeSubdomain: 'angerbogen',
      appDomain: 'localhost',
      currentOrigin: 'http://localhost:5173',
    })
    expect(r.usedSubdomainHost).toBe(true)
    expect(r.url).toBe('http://angerbogen.localhost:5173/kasse/tok')
  })

  it('faellt auf currentOrigin zurueck ohne Subdomain', () => {
    const r = buildKioskEntranceUrl({
      token: 'tok',
      storeSubdomain: null,
      appDomain: 'example.com',
      currentOrigin: 'https://app.example.com',
    })
    expect(r.usedSubdomainHost).toBe(false)
    expect(r.url).toBe('https://app.example.com/kasse/tok')
  })

  it('faellt auf currentOrigin zurueck bei reservierter Subdomain', () => {
    const r = buildKioskEntranceUrl({
      token: 'x',
      storeSubdomain: 'admin',
      appDomain: 'example.com',
      currentOrigin: 'https://localhost:5173',
    })
    expect(r.usedSubdomainHost).toBe(false)
    expect(r.url).toBe('https://localhost:5173/kasse/x')
  })
})

describe('isKioskEntranceUrlMisdeployedForHostname', () => {
  it('true wenn Seite Production-artig aber URL *.localhost', () => {
    expect(
      isKioskEntranceUrlMisdeployedForHostname(
        'http://angerbogen.localhost/kasse/tok',
        'vierhub.de',
      ),
    ).toBe(true)
  })

  it('false wenn Seite lokal und URL localhost', () => {
    expect(
      isKioskEntranceUrlMisdeployedForHostname(
        'http://angerbogen.localhost:5173/kasse/tok',
        'localhost',
      ),
    ).toBe(false)
  })

  it('false wenn URL echte Domain', () => {
    expect(
      isKioskEntranceUrlMisdeployedForHostname(
        'https://angerbogen.example.com/kasse/tok',
        'app.vercel.app',
      ),
    ).toBe(false)
  })
})

describe('kioskUrlSharesOriginWithPage', () => {
  it('erkennt gleiche Origin', () => {
    expect(
      kioskUrlSharesOriginWithPage('https://a.de/kasse/1', 'https://a.de/admin'),
    ).toBe(true)
  })

  it('erkennt unterschiedliche Origin', () => {
    expect(
      kioskUrlSharesOriginWithPage('https://b.a.de/kasse/1', 'https://app.a.de/'),
    ).toBe(false)
  })
})
