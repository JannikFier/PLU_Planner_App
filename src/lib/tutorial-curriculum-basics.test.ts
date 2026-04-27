import { describe, expect, it } from 'vitest'
import { buildBasicsInteractiveTasks, buildBasicsPickAreaTasks } from './tutorial-curriculum-basics'

describe('buildBasicsInteractiveTasks', () => {
  it('liefert keine Tasks wenn Testmodus-Schritt ausgeschaltet', () => {
    expect(
      buildBasicsInteractiveTasks({ showTestModeStep: false, getTestMode: () => false }),
    ).toHaveLength(0)
  })
})

describe('buildBasicsPickAreaTasks', () => {
  it('validiert Verlassen des nackten Rollen-Dashboards', () => {
    const tasks = buildBasicsPickAreaTasks(() => '/user')
    expect(tasks).toHaveLength(1)
    expect(tasks[0]!.validate()).toBe(false)

    const tasks2 = buildBasicsPickAreaTasks(() => '/user/masterlist')
    expect(tasks2[0]!.validate()).toBe(true)

    const tasks3 = buildBasicsPickAreaTasks(() => '/admin/obst')
    expect(tasks3[0]!.validate()).toBe(true)
  })
})
