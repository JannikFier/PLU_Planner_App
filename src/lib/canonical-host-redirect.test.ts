import { describe, expect, it } from 'vitest'
import { getPostLoginCanonicalRedirectUrl, getStoreSwitchHostRedirectUrl } from '@/lib/canonical-host-redirect'

describe('getPostLoginCanonicalRedirectUrl', () => {
  it('localhost: kein Redirect', () => {
    expect(
      getPostLoginCanonicalRedirectUrl({
        appDomain: 'localhost',
        hostname: 'foo.localhost',
        profileRole: 'super_admin',
        storeSubdomain: null,
        storeLoading: false,
        isAdminDomain: false,
        preview: null,
        fromPathname: undefined,
      }),
    ).toBeNull()
  })

  it('super_admin auf www: kein Redirect', () => {
    expect(
      getPostLoginCanonicalRedirectUrl({
        appDomain: 'fier-hub.de',
        hostname: 'www.fier-hub.de',
        profileRole: 'super_admin',
        storeSubdomain: null,
        storeLoading: false,
        isAdminDomain: false,
        preview: null,
        fromPathname: undefined,
      }),
    ).toBeNull()
  })

  it('super_admin auf Markt-Host: Redirect zu www + super-admin', () => {
    expect(
      getPostLoginCanonicalRedirectUrl({
        appDomain: 'fier-hub.de',
        hostname: 'angerbogen.fier-hub.de',
        profileRole: 'super_admin',
        storeSubdomain: 'angerbogen',
        storeLoading: false,
        isAdminDomain: false,
        preview: null,
        fromPathname: undefined,
      }),
    ).toBe('https://www.fier-hub.de/super-admin')
  })

  it('user auf www mit Markt: Redirect zur Markt-URL', () => {
    expect(
      getPostLoginCanonicalRedirectUrl({
        appDomain: 'fier-hub.de',
        hostname: 'www.fier-hub.de',
        profileRole: 'user',
        storeSubdomain: 'angerbogen',
        storeLoading: false,
        isAdminDomain: false,
        preview: null,
        fromPathname: undefined,
      }),
    ).toBe('https://angerbogen.fier-hub.de/user')
  })

  it('admin-Subdomain: kein Markt-Redirect', () => {
    expect(
      getPostLoginCanonicalRedirectUrl({
        appDomain: 'fier-hub.de',
        hostname: 'admin.fier-hub.de',
        profileRole: 'admin',
        storeSubdomain: 'x',
        storeLoading: false,
        isAdminDomain: true,
        preview: null,
        fromPathname: undefined,
      }),
    ).toBeNull()
  })
})

describe('getStoreSwitchHostRedirectUrl', () => {
  it('gleicher Host: null', () => {
    expect(
      getStoreSwitchHostRedirectUrl({
        appDomain: 'fier-hub.de',
        newStoreSubdomain: 'angerbogen',
        profileRole: 'user',
        preview: null,
        currentHostname: 'angerbogen.fier-hub.de',
      }),
    ).toBeNull()
  })

  it('anderer Markt-Host: volle URL mit Dashboard', () => {
    expect(
      getStoreSwitchHostRedirectUrl({
        appDomain: 'fier-hub.de',
        newStoreSubdomain: 'b',
        profileRole: 'admin',
        preview: null,
        currentHostname: 'a.fier-hub.de',
      }),
    ).toBe('https://b.fier-hub.de/admin')
  })
})
