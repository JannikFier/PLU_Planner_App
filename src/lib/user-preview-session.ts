/**
 * Super-Admin User-Vorschau: Persistenz in sessionStorage (ohne Auth-Token).
 * StoreContext liest hieraus, um den Vorschau-Markt nach Reload beizubehalten.
 */

import type { AppRole } from '@/lib/permissions'

export const USER_PREVIEW_SESSION_KEY = 'plu_user_preview'

/** Rollen, die die Vorschau simulieren kann (kein super_admin). */
export type UserPreviewSimulatedRole = Extract<AppRole, 'user' | 'viewer' | 'admin'>

export interface UserPreviewSessionState {
  active: true
  storeId: string
  simulatedRole: UserPreviewSimulatedRole
  /** Markt vor Eintritt in die Vorschau (für Restore beim Verlassen). */
  previousStoreId: string | null
}

export function readUserPreviewState(): UserPreviewSessionState | null {
  try {
    const raw = sessionStorage.getItem(USER_PREVIEW_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<UserPreviewSessionState>
    if (
      parsed?.active !== true
      || typeof parsed.storeId !== 'string'
      || !isSimulatedRole(parsed.simulatedRole)
    ) {
      return null
    }
    const previousStoreId =
      parsed.previousStoreId === null || typeof parsed.previousStoreId === 'string'
        ? parsed.previousStoreId
        : null
    return {
      active: true,
      storeId: parsed.storeId,
      simulatedRole: parsed.simulatedRole,
      previousStoreId,
    }
  } catch {
    return null
  }
}

function isSimulatedRole(v: unknown): v is UserPreviewSimulatedRole {
  return v === 'user' || v === 'viewer' || v === 'admin'
}

export function writeUserPreviewState(state: UserPreviewSessionState): void {
  try {
    sessionStorage.setItem(USER_PREVIEW_SESSION_KEY, JSON.stringify(state))
  } catch {
    /* sessionStorage voll */
  }
}

export function clearUserPreviewState(): void {
  try {
    sessionStorage.removeItem(USER_PREVIEW_SESSION_KEY)
  } catch {
    /* ignore */
  }
}
