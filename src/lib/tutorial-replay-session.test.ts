import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDeferReplayWelcome,
  deferReplayWelcomeForCurrentBrowserSession,
  isReplayWelcomeDeferred,
} from './tutorial-replay-session'

describe('tutorial-replay-session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearDeferReplayWelcome()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('isReplayWelcomeDeferred ist true kurz nach defer', () => {
    deferReplayWelcomeForCurrentBrowserSession()
    expect(isReplayWelcomeDeferred()).toBe(true)
  })

  it('isReplayWelcomeDeferred ist false nach Ablauf der Suppress-Dauer', () => {
    deferReplayWelcomeForCurrentBrowserSession()
    vi.advanceTimersByTime(1500)
    expect(isReplayWelcomeDeferred()).toBe(false)
  })

  it('clearDeferReplayWelcome hebt die Unterdrückung sofort auf', () => {
    deferReplayWelcomeForCurrentBrowserSession()
    expect(isReplayWelcomeDeferred()).toBe(true)
    clearDeferReplayWelcome()
    expect(isReplayWelcomeDeferred()).toBe(false)
  })
})
