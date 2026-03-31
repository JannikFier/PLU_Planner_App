import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  USER_PREVIEW_SESSION_KEY,
  readUserPreviewState,
  writeUserPreviewState,
  clearUserPreviewState,
} from '@/lib/user-preview-session'

/** Minimal sessionStorage für Node (Vitest environment: node). */
const sessionMemory: Record<string, string> = {}
const mockStorage: Storage = {
  get length() {
    return Object.keys(sessionMemory).length
  },
  clear: () => {
    for (const k of Object.keys(sessionMemory)) delete sessionMemory[k]
  },
  getItem: (k: string) => (k in sessionMemory ? sessionMemory[k] : null),
  key: (i: number) => Object.keys(sessionMemory)[i] ?? null,
  removeItem: (k: string) => {
    delete sessionMemory[k]
  },
  setItem: (k: string, v: string) => {
    sessionMemory[k] = v
  },
}

describe('user-preview-session', () => {
  beforeAll(() => {
    vi.stubGlobal('sessionStorage', mockStorage)
  })
  beforeEach(() => {
    mockStorage.clear()
  })

  it('roundtrip schreiben und lesen', () => {
    writeUserPreviewState({
      active: true,
      storeId: 'store-1',
      simulatedRole: 'user',
      previousStoreId: 'prev-1',
    })
    expect(readUserPreviewState()).toEqual({
      active: true,
      storeId: 'store-1',
      simulatedRole: 'user',
      previousStoreId: 'prev-1',
    })
  })

  it('previousStoreId null', () => {
    writeUserPreviewState({
      active: true,
      storeId: 's',
      simulatedRole: 'viewer',
      previousStoreId: null,
    })
    expect(readUserPreviewState()?.previousStoreId).toBeNull()
  })

  it('clear entfernt State', () => {
    writeUserPreviewState({
      active: true,
      storeId: 's',
      simulatedRole: 'admin',
      previousStoreId: null,
    })
    clearUserPreviewState()
    expect(readUserPreviewState()).toBeNull()
  })

  it('ungültiges JSON liefert null', () => {
    sessionStorage.setItem(USER_PREVIEW_SESSION_KEY, 'not-json')
    expect(readUserPreviewState()).toBeNull()
  })
})
