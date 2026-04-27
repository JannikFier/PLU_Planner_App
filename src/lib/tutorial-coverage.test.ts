/**
 * Tutorial-Coverage-Tests
 *
 * Stellt sicher, dass:
 *  - jede deklarierte `TutorialCapability` mindestens einen Curriculum-Step bekommt,
 *  - die Capability-Liste keine Duplikate enthaelt,
 *  - `getDeviceClass()` saubere Breakpoints liefert.
 *
 * In PR 1 ist die Registry leer; der Coverage-Check laeuft daher als
 * `test.todo` und wird in PR 3+ aktiviert, sobald Steps registriert werden.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { TUTORIAL_CAPABILITIES } from '@/lib/tutorial-capabilities'
import { collectAllCurriculumSteps } from '@/lib/tutorial-curriculum-registry'
import { getDeviceClass } from '@/lib/tutorial-mobile-anchor'
import type { TutorialStepModule } from '@/lib/tutorial-step-types'

describe('TUTORIAL_CAPABILITIES', () => {
  it('ist nicht leer', () => {
    expect(TUTORIAL_CAPABILITIES.length).toBeGreaterThan(0)
  })

  it('enthaelt keine Duplikate', () => {
    const seen = new Set<string>()
    for (const c of TUTORIAL_CAPABILITIES) {
      expect(seen.has(c)).toBe(false)
      seen.add(c)
    }
  })
})

describe('Curriculum-Coverage', () => {
  it('jede Capability hat mindestens einen Step in der Registry', () => {
    const steps = collectAllCurriculumSteps()
    const covered = new Set(steps.map((s) => s.capability))
    const missing = TUTORIAL_CAPABILITIES.filter((c) => !covered.has(c))
    expect(missing).toEqual([])
  })

  it('Registry-IDs sind eindeutig', () => {
    const steps = collectAllCurriculumSteps()
    const ids = steps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('Registry-Reihenfolge ist deterministisch (cross -> obst -> backshop -> users)', () => {
    const steps = collectAllCurriculumSteps()
    const order: TutorialStepModule[] = [
      'cross-cutting',
      'obst',
      'obst-konfig',
      'backshop',
      'backshop-marken',
      'backshop-konfig',
      'users',
    ]
    let lastIdx = -1
    for (const s of steps) {
      const idx = order.indexOf(s.module)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeGreaterThanOrEqual(lastIdx)
      lastIdx = idx
    }
  })
})

describe('getDeviceClass', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('liefert mobile fuer < 768 px', () => {
    vi.stubGlobal('window', { innerWidth: 500, matchMedia: () => ({}) })
    expect(getDeviceClass()).toBe('mobile')
  })

  it('liefert tablet fuer 768..1279 px', () => {
    vi.stubGlobal('window', { innerWidth: 768, matchMedia: () => ({}) })
    expect(getDeviceClass()).toBe('tablet')
    vi.stubGlobal('window', { innerWidth: 1279, matchMedia: () => ({}) })
    expect(getDeviceClass()).toBe('tablet')
  })

  it('liefert desktop ab 1280 px', () => {
    vi.stubGlobal('window', { innerWidth: 1280, matchMedia: () => ({}) })
    expect(getDeviceClass()).toBe('desktop')
    vi.stubGlobal('window', { innerWidth: 1920, matchMedia: () => ({}) })
    expect(getDeviceClass()).toBe('desktop')
  })

  it('faellt ohne window auf desktop zurueck', () => {
    vi.stubGlobal('window', undefined)
    expect(getDeviceClass()).toBe('desktop')
  })
})
