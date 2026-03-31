import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useStoreContext } from '@/contexts/StoreContext'
import {
  clearUserPreviewState,
  readUserPreviewState,
  writeUserPreviewState,
  type UserPreviewSimulatedRole,
  type UserPreviewSessionState,
} from '@/lib/user-preview-session'

interface UserPreviewContextValue {
  /** Aktive Super-Admin-User-Vorschau (sessionStorage + Store). */
  preview: UserPreviewSessionState | null
  isUserPreviewActive: boolean
  simulatedRole: UserPreviewSimulatedRole | null
  enterUserPreview: (params: {
    storeId: string
    simulatedRole: UserPreviewSimulatedRole
  }) => Promise<void>
  exitUserPreview: () => Promise<void>
}

const UserPreviewContext = createContext<UserPreviewContextValue | null>(null)

export function UserPreviewProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { setActiveStore, currentStoreId, reresolveStoreFromAuth } = useStoreContext()

  const [preview, setPreview] = useState<UserPreviewSessionState | null>(() => readUserPreviewState())

  useEffect(() => {
    if (!user) {
      clearUserPreviewState()
      queueMicrotask(() => setPreview(null))
    }
  }, [user])

  const enterUserPreview = useCallback(
    async (params: { storeId: string; simulatedRole: UserPreviewSimulatedRole }) => {
      const previousStoreId = currentStoreId ?? profile?.current_store_id ?? null
      const next: UserPreviewSessionState = {
        active: true,
        storeId: params.storeId,
        simulatedRole: params.simulatedRole,
        previousStoreId,
      }
      writeUserPreviewState(next)
      setPreview(next)
      await setActiveStore(params.storeId, { syncToProfile: false })
    },
    [currentStoreId, profile?.current_store_id, setActiveStore],
  )

  const exitUserPreview = useCallback(async () => {
    const snap = readUserPreviewState()
    clearUserPreviewState()
    setPreview(null)

    if (snap?.previousStoreId) {
      await setActiveStore(snap.previousStoreId, { syncToProfile: true })
      return
    }
    if (profile?.current_store_id) {
      await setActiveStore(profile.current_store_id, { syncToProfile: true })
      return
    }
    reresolveStoreFromAuth()
  }, [profile, reresolveStoreFromAuth, setActiveStore])

  const value = useMemo(
    (): UserPreviewContextValue => ({
      preview,
      isUserPreviewActive: preview?.active === true,
      simulatedRole: preview?.active ? preview.simulatedRole : null,
      enterUserPreview,
      exitUserPreview,
    }),
    [preview, enterUserPreview, exitUserPreview],
  )

  return (
    <UserPreviewContext.Provider value={value}>
      {children}
    </UserPreviewContext.Provider>
  )
}

export function useUserPreview(): UserPreviewContextValue { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(UserPreviewContext)
  if (!ctx) {
    throw new Error('useUserPreview muss innerhalb von UserPreviewProvider verwendet werden.')
  }
  return ctx
}
