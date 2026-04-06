import { describe, it, expect } from 'vitest'
import { isSafeAdminBackToTarget } from '@/lib/admin-back-navigation'

describe('isSafeAdminBackToTarget', () => {
  it('erlaubt typische Admin-Pfade', () => {
    expect(isSafeAdminBackToTarget('/admin/masterlist')).toBe(true)
    expect(isSafeAdminBackToTarget('/admin/obst/konfiguration')).toBe(true)
    expect(isSafeAdminBackToTarget('/admin/obst-warengruppen?backTo=%2Fadmin%2Fmasterlist')).toBe(true)
  })

  it('lehnt Nicht-Admin und Tricks ab', () => {
    expect(isSafeAdminBackToTarget('/super-admin/masterlist')).toBe(false)
    expect(isSafeAdminBackToTarget('/admin')).toBe(false)
    expect(isSafeAdminBackToTarget('https://evil.com')).toBe(false)
    expect(isSafeAdminBackToTarget('/admin//evil')).toBe(false)
    expect(isSafeAdminBackToTarget('javascript:alert(1)')).toBe(false)
  })
})
