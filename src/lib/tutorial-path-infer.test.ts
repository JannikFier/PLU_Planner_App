import { describe, expect, it } from 'vitest'
import { inferTutorialModuleFromPath } from './tutorial-path-infer'

describe('inferTutorialModuleFromPath', () => {
  it('mappt Admin-Backshop-Hub', () => {
    expect(inferTutorialModuleFromPath('/admin/backshop')).toBe('backshop')
  })
  it('mappt User-Obst-Hub', () => {
    expect(inferTutorialModuleFromPath('/user/obst')).toBe('obst')
  })
  it('mappt Masterliste', () => {
    expect(inferTutorialModuleFromPath('/admin/masterlist')).toBe('obst')
  })
  it('mappt Backshop-Liste', () => {
    expect(inferTutorialModuleFromPath('/viewer/backshop-list')).toBe('backshop')
  })
  it('mappt Marken-Auswahl mit Rollenpräfix', () => {
    expect(inferTutorialModuleFromPath('/admin/marken-auswahl')).toBe('backshop-marken')
  })
  it('gibt bei Dashboard ohne Ziel null zurück', () => {
    expect(inferTutorialModuleFromPath('/admin')).toBeNull()
  })
})
