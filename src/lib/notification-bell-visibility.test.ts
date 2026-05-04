import { describe, it, expect } from 'vitest'
import { shouldShowNotificationBell } from './notification-bell-visibility'

describe('shouldShowNotificationBell', () => {
  it('versteckt fuer viewer und super_admin', () => {
    expect(shouldShowNotificationBell('viewer', '/masterlist')).toBe(false)
    expect(shouldShowNotificationBell('super_admin', '/masterlist')).toBe(false)
  })

  it('versteckt bei fehlender Rolle / Pfad', () => {
    expect(shouldShowNotificationBell(null, '/masterlist')).toBe(false)
    expect(shouldShowNotificationBell('admin', null)).toBe(false)
    expect(shouldShowNotificationBell('admin', '')).toBe(false)
  })

  it('zeigt auf Rollen-Dashboards', () => {
    expect(shouldShowNotificationBell('admin', '/admin')).toBe(true)
    expect(shouldShowNotificationBell('admin', '/admin/')).toBe(true)
    expect(shouldShowNotificationBell('user', '/user')).toBe(true)
  })

  it('zeigt auf Obst-Masterliste und Unterseiten', () => {
    expect(shouldShowNotificationBell('user', '/masterlist')).toBe(true)
    expect(shouldShowNotificationBell('user', '/admin/masterlist')).toBe(true)
    expect(shouldShowNotificationBell('user', '/custom-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/hidden-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/offer-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/renamed-products')).toBe(true)
  })

  it('zeigt auf Backshop-Liste und Unterseiten', () => {
    expect(shouldShowNotificationBell('user', '/user/backshop')).toBe(true)
    expect(shouldShowNotificationBell('user', '/user/backshop-kacheln')).toBe(true)
    expect(shouldShowNotificationBell('user', '/backshop-list')).toBe(true)
    expect(shouldShowNotificationBell('user', '/backshop-custom-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/backshop-hidden-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/backshop-offer-products')).toBe(true)
    expect(shouldShowNotificationBell('user', '/backshop-renamed-products')).toBe(true)
  })

  it('versteckt auf Konfig/Verwaltung/Wizards', () => {
    expect(shouldShowNotificationBell('admin', '/admin/users')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/backshop/konfiguration')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/obst/konfiguration')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/layout')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/rules')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/backshop-layout')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/backshop-rules')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/backshop-gruppenregeln')).toBe(false)
    expect(shouldShowNotificationBell('user', '/marken-auswahl')).toBe(false)
    expect(shouldShowNotificationBell('admin', '/admin/backshop-upload')).toBe(false)
    expect(shouldShowNotificationBell('user', '/profile')).toBe(false)
    expect(shouldShowNotificationBell('user', '/change-password')).toBe(false)
  })
})
