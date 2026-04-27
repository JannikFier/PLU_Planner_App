import { describe, expect, it } from 'vitest'
import {
  buildObstWerbungTasks,
  buildBackshopWerbungTasks,
  buildWerbungTasks,
} from './tutorial-curriculum-werbung'

describe('buildWerbungTasks', () => {
  it('liefert nur Obst-Steps wenn nur Obst sichtbar', () => {
    const tasks = buildWerbungTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: false,
    })
    expect(tasks.some((t) => t.id.startsWith('werbung-obst-'))).toBe(true)
    expect(tasks.some((t) => t.id.startsWith('werbung-backshop-'))).toBe(false)
  })

  it('liefert nur Backshop-Steps wenn nur Backshop sichtbar', () => {
    const tasks = buildWerbungTasks({
      getPathname: () => '/user/backshop-list',
      obstVisible: false,
      backshopVisible: true,
    })
    expect(tasks.some((t) => t.id.startsWith('werbung-obst-'))).toBe(false)
    expect(tasks.some((t) => t.id.startsWith('werbung-backshop-'))).toBe(true)
  })

  it('kombiniert beide Bereiche, wenn beides sichtbar ist', () => {
    const tasks = buildWerbungTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: true,
    })
    expect(tasks.some((t) => t.id.startsWith('werbung-obst-'))).toBe(true)
    expect(tasks.some((t) => t.id.startsWith('werbung-backshop-'))).toBe(true)
  })

  it('Task-IDs sind global eindeutig', () => {
    const tasks = buildWerbungTasks({
      getPathname: () => '/user/masterlist',
      obstVisible: true,
      backshopVisible: true,
    })
    const ids = tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('buildObstWerbungTasks Snapshot', () => {
  it('liefert deterministische Reihenfolge', () => {
    const tasks = buildObstWerbungTasks(() => '/user/masterlist/offer-products')
    expect(tasks.map((t) => t.id)).toEqual([
      'werbung-obst-open',
      'werbung-obst-toolbar',
      'werbung-obst-zentral',
      'werbung-obst-eigen',
      'werbung-obst-excel',
      'werbung-obst-add',
      'werbung-obst-carryover',
    ])
  })
})

describe('buildBackshopWerbungTasks Snapshot', () => {
  it('liefert deterministische Reihenfolge', () => {
    const tasks = buildBackshopWerbungTasks(() => '/user/backshop-list/backshop-offer-products')
    expect(tasks.map((t) => t.id)).toEqual([
      'werbung-backshop-open',
      'werbung-backshop-toolbar',
      'werbung-backshop-zentral',
      'werbung-backshop-eigen',
      'werbung-backshop-excel',
      'werbung-backshop-add',
    ])
  })
})
