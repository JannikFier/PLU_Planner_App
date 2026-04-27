import { describe, expect, it, vi } from 'vitest'
import { runTaskQueue, TUTORIAL_INTERACTIVE_ACK_EVENT, type TutorialTask } from '@/lib/tutorial-interactive-engine'

describe('runTaskQueue', () => {
  it('führt Tasks aus, sobald validate true ist', async () => {
    let n = 0
    const tasks: TutorialTask[] = [
      {
        id: 'a',
        headline: 'A',
        body: 'B',
        pollIntervalMs: 15,
        validate: () => {
          n += 1
          return n >= 2
        },
      },
    ]
    const p = runTaskQueue(tasks)
    const r = await p
    expect(r).toBe('finished')
  })

  it('bricht bei AbortSignal ab', async () => {
    vi.useFakeTimers()
    const ac = new AbortController()
    const tasks: TutorialTask[] = [
      {
        id: 'slow',
        headline: 'S',
        body: 'B',
        pollIntervalMs: 20,
        validate: () => false,
      },
    ]
    const p = runTaskQueue(tasks, { signal: ac.signal })
    await vi.advanceTimersByTimeAsync(25)
    ac.abort()
    await vi.advanceTimersByTimeAsync(25)
    const r = await p
    expect(r).toBe('aborted')
    vi.useRealTimers()
  })

  it('requiresAcknowledge: wartet auf Ack-Event (EventTarget)', async () => {
    const bus = new EventTarget()
    const tasks: TutorialTask[] = [
      {
        id: 'ack',
        headline: 'H',
        body: 'b',
        requiresAcknowledge: true,
        validate: () => false,
      },
    ]
    const p = runTaskQueue(tasks, { ackEventTarget: bus })
    await Promise.resolve()
    bus.dispatchEvent(new CustomEvent(TUTORIAL_INTERACTIVE_ACK_EVENT))
    const r = await p
    expect(r).toBe('finished')
  })
})
