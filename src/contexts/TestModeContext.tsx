import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface TestModeContextType {
  isTestMode: boolean
  enableTestMode: () => void
  disableTestMode: () => void
  showExitConfirm: boolean
  setShowExitConfirm: (show: boolean) => void
}

const TestModeContext = createContext<TestModeContextType>({
  isTestMode: false,
  enableTestMode: () => {},
  disableTestMode: () => {},
  showExitConfirm: false,
  setShowExitConfirm: () => {},
})

/**
 * Testmodus-Provider – ermoeglicht einen Sandbox-Modus im Frontend.
 * Mutationen werden abgefangen und nur lokal im TanStack-Query-Cache angewendet.
 */
export function TestModeProvider({ children }: { children: ReactNode }) {
  const [isTestMode, setIsTestMode] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const queryClient = useQueryClient()
  const cacheSnapshot = useRef<string | null>(null)

  const enableTestMode = useCallback(() => {
    // Aktuellen Cache-Zustand speichern
    const cache = queryClient.getQueryCache().getAll()
    const snapshot = cache.map(query => ({
      queryKey: query.queryKey,
      data: query.state.data,
    }))
    cacheSnapshot.current = JSON.stringify(snapshot)
    setIsTestMode(true)
  }, [queryClient])

  const disableTestMode = useCallback(() => {
    // Cache auf Snapshot zuruecksetzen
    if (cacheSnapshot.current) {
      try {
        const snapshot = JSON.parse(cacheSnapshot.current) as Array<{
          queryKey: unknown[]
          data: unknown
        }>
        for (const { queryKey, data } of snapshot) {
          queryClient.setQueryData(queryKey, data)
        }
      } catch {
        // Fallback: Cache komplett invalidieren
        queryClient.invalidateQueries()
      }
    }

    cacheSnapshot.current = null
    setIsTestMode(false)
    setShowExitConfirm(false)
  }, [queryClient])

  return (
    <TestModeContext.Provider
      value={{
        isTestMode,
        enableTestMode,
        disableTestMode,
        showExitConfirm,
        setShowExitConfirm,
      }}
    >
      {children}
    </TestModeContext.Provider>
  )
}

export function useTestMode() {
  return useContext(TestModeContext)
}
