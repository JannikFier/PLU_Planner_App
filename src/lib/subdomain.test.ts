import { describe, expect, it } from 'vitest'
import { normalizeViteAppDomain, buildMarketLoginUrl, buildSuperAdminCanonicalOrigin } from '@/lib/subdomain'

describe('normalizeViteAppDomain', () => {
  it('leer oder nur Leerzeichen -> localhost', () => {
    expect(normalizeViteAppDomain(undefined)).toBe('localhost')
    expect(normalizeViteAppDomain('')).toBe('localhost')
    expect(normalizeViteAppDomain('   ')).toBe('localhost')
  })

  it('nur Hostname bleibt erhalten', () => {
    expect(normalizeViteAppDomain('fier-hub.de')).toBe('fier-hub.de')
    expect(normalizeViteAppDomain('Example.COM')).toBe('example.com')
  })

  it('entfernt https und Pfad', () => {
    expect(normalizeViteAppDomain('https://fier-hub.de/')).toBe('fier-hub.de')
    expect(normalizeViteAppDomain('https://fier-hub.de/app')).toBe('fier-hub.de')
  })

  it('entfernt http', () => {
    expect(normalizeViteAppDomain('http://fier-hub.de')).toBe('fier-hub.de')
  })
})

describe('buildMarketLoginUrl', () => {
  it('Produktion: https + /login', () => {
    expect(buildMarketLoginUrl('angerbogen', 'fier-hub.de')).toBe('https://angerbogen.fier-hub.de/login')
  })

  it('localhost: http + /login', () => {
    expect(buildMarketLoginUrl('markt1', 'localhost')).toBe('http://markt1.localhost/login')
  })
})

describe('buildSuperAdminCanonicalOrigin', () => {
  it('localhost -> null', () => {
    expect(buildSuperAdminCanonicalOrigin('localhost')).toBeNull()
  })

  it('echte Domain -> https www', () => {
    expect(buildSuperAdminCanonicalOrigin('fier-hub.de')).toBe('https://www.fier-hub.de')
  })
})
