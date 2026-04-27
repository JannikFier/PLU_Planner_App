import { describe, expect, it } from 'vitest'
import { buildUsersLightTasks } from './tutorial-curriculum-users-light'

describe('buildUsersLightTasks', () => {
  it('liefert die fuenf Light-Steps in stabiler Reihenfolge', () => {
    const tasks = buildUsersLightTasks(() => '/admin/users')
    expect(tasks.map((t) => t.id)).toEqual([
      'users-light-page',
      'users-light-list',
      'users-light-new',
      'users-light-edit',
      'users-light-reset',
    ])
  })

  it('alle Steps sind Acknowledge-Hinweise', () => {
    const tasks = buildUsersLightTasks(() => '/admin/users')
    for (const t of tasks) {
      expect(t.requiresAcknowledge).toBe(true)
    }
  })
})
