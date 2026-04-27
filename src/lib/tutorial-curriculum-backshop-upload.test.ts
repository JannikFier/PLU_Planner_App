import { describe, expect, it } from 'vitest'
import { buildBackshopUploadTasks } from './tutorial-curriculum-backshop-upload'

describe('buildBackshopUploadTasks', () => {
  it('liefert genau die zehn Wizard-Steps in deterministischer Reihenfolge', () => {
    const tasks = buildBackshopUploadTasks(() => '/admin/backshop-upload')
    expect(tasks.map((t) => t.id)).toEqual([
      'backshop-upload-wizard',
      'backshop-upload-stepper',
      'backshop-upload-step-upload',
      'backshop-upload-dropzone',
      'backshop-upload-analyze',
      'backshop-upload-analyze-card',
      'backshop-upload-mapping',
      'backshop-upload-groups',
      'backshop-upload-review',
      'backshop-upload-publish',
    ])
  })

  it('alle Steps sind Acknowledge-Hinweise (kein Action-Step)', () => {
    const tasks = buildBackshopUploadTasks(() => '/admin/backshop-upload')
    for (const t of tasks) {
      expect(t.requiresAcknowledge).toBe(true)
    }
  })

  it('Task-IDs sind eindeutig', () => {
    const tasks = buildBackshopUploadTasks(() => '/admin/backshop-upload')
    const ids = tasks.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
