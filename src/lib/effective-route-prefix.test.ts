import { describe, it, expect } from 'vitest'
import {
  getEffectiveRouteRole,
  getHomeDashboardPath,
  roleToDashboardPath,
} from '@/lib/effective-route-prefix'

describe('effective-route-prefix', () => {
  it('roleToDashboardPath', () => {
    expect(roleToDashboardPath('super_admin')).toBe('/super-admin')
    expect(roleToDashboardPath('admin')).toBe('/admin')
    expect(roleToDashboardPath('viewer')).toBe('/viewer')
    expect(roleToDashboardPath('user')).toBe('/user')
  })

  it('Vorschau überschreibt Profil-Rolle', () => {
    expect(
      getEffectiveRouteRole('super_admin', { active: true, simulatedRole: 'user' }),
    ).toBe('user')
    expect(
      getHomeDashboardPath('super_admin', {
        active: true,
        storeId: 'x',
        simulatedRole: 'viewer',
        previousStoreId: null,
      }),
    ).toBe('/viewer')
  })

  it('ohne Vorschau: Profil-Rolle', () => {
    expect(getEffectiveRouteRole('super_admin', null)).toBe('super_admin')
    expect(getHomeDashboardPath('super_admin', null)).toBe('/super-admin')
  })
})
