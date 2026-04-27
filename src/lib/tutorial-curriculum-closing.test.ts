import { describe, expect, it } from 'vitest'
import { buildTourClosingTasks } from './tutorial-curriculum-closing'

describe('buildTourClosingTasks', () => {
  it('liefert mit Bell-Hinweis fuenf Acknowledge-Steps', () => {
    const tasks = buildTourClosingTasks(() => '/user/masterlist', { showBellHint: true })
    expect(tasks).toHaveLength(5)
    expect(tasks.map((t) => t.id)).toEqual([
      'closing-summary',
      'closing-replay',
      'closing-bell',
      'closing-kw',
      'closing-wrap',
    ])
    for (const t of tasks) {
      expect(t.requiresAcknowledge).toBe(true)
      // ackStep validiert intern auf false; weiter geht es ueber Acknowledge.
      expect(t.validate()).toBe(false)
    }
  })

  it('blendet Glocken-Hinweis aus, wenn showBellHint=false', () => {
    const tasks = buildTourClosingTasks(() => '/user/masterlist', { showBellHint: false })
    expect(tasks).toHaveLength(4)
    expect(tasks.map((t) => t.id)).not.toContain('closing-bell')
  })
})
