import { describe, expect, it } from 'vitest'
import { buildHiddenRenamedCustomTasks } from './tutorial-curriculum-hidden-renamed-custom'

describe('buildHiddenRenamedCustomTasks', () => {
  it('enthaelt nur Obst-Steps wenn nur Obst sichtbar', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: false,
    })
    const ids = tasks.map((t) => t.id)
    expect(ids.some((id) => id.startsWith('detail-obst-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('detail-bs-'))).toBe(false)
  })

  it('enthaelt nur Backshop-Steps wenn nur Backshop sichtbar', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/backshop-list',
      obstVisible: false,
      backshopVisible: true,
    })
    const ids = tasks.map((t) => t.id)
    expect(ids.some((id) => id.startsWith('detail-obst-'))).toBe(false)
    expect(ids.some((id) => id.startsWith('detail-bs-'))).toBe(true)
  })

  it('kombiniert beide Bereiche', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: true,
    })
    const ids = tasks.map((t) => t.id)
    expect(ids.some((id) => id.startsWith('detail-obst-'))).toBe(true)
    expect(ids.some((id) => id.startsWith('detail-bs-'))).toBe(true)
  })

  it('IDs sind global eindeutig', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: true,
    })
    const ids = tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('schliesst Obst-Sequenz mit detail-obst-back ab', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: false,
    })
    expect(tasks[tasks.length - 1]!.id).toBe('detail-obst-back')
  })

  it('schliesst Backshop-Sequenz mit detail-bs-back ab', () => {
    const tasks = buildHiddenRenamedCustomTasks({
      getPathname: () => '/user/backshop-list',
      obstVisible: false,
      backshopVisible: true,
    })
    expect(tasks[tasks.length - 1]!.id).toBe('detail-bs-back')
  })
})
