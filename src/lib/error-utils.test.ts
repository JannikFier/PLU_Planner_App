import { describe, expect, it } from 'vitest'
import { isAbortError, LOGIN_ABORT_USER_MESSAGE, shouldReportGlobalError } from './error-utils'

describe('error-utils', () => {
  describe('isAbortError', () => {
    it('erkennt DOMException AbortError', () => {
      const err = new DOMException('signal is aborted without reason', 'AbortError')
      expect(isAbortError(err)).toBe(true)
    })

    it('erkennt Error mit name AbortError', () => {
      const err = new Error('cancelled')
      err.name = 'AbortError'
      expect(isAbortError(err)).toBe(true)
    })

    it('folgt cause-Kette', () => {
      const inner = new DOMException('aborted', 'AbortError')
      const outer = new Error('wrap')
      ;(outer as Error & { cause?: unknown }).cause = inner
      expect(isAbortError(outer)).toBe(true)
    })

    it('lehnt normale Fehler ab', () => {
      expect(isAbortError(new Error('fail'))).toBe(false)
    })

    it('erkennt Duck-Typing name AbortError ohne Error-Prototype', () => {
      expect(
        isAbortError({ name: 'AbortError', message: 'signal is aborted without reason' } as unknown),
      ).toBe(true)
    })

    it('erkennt Nachricht signal is aborted ohne name', () => {
      expect(isAbortError(new Error('signal is aborted without reason'))).toBe(true)
    })
  })

  it('LOGIN_ABORT_USER_MESSAGE ist nicht leer', () => {
    expect(LOGIN_ABORT_USER_MESSAGE.length).toBeGreaterThan(10)
  })

  describe('shouldReportGlobalError', () => {
    it('meldet AbortError nicht', () => {
      const err = new DOMException('signal is aborted without reason', 'AbortError')
      expect(shouldReportGlobalError(err)).toBe(false)
    })

    it('meldet signal is aborted in Nachricht nicht', () => {
      expect(shouldReportGlobalError(new Error('signal is aborted without reason'))).toBe(false)
    })

    it('meldet normale Fehler', () => {
      expect(shouldReportGlobalError(new Error('echter Fehler'))).toBe(true)
    })
  })
})
