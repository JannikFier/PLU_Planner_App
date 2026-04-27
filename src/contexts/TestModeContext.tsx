import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setTestModeFlag } from '@/lib/supabase'
import { toast } from 'sonner'
import { TUTORIAL_TESTMODE_TURNED_OFF_EVENT } from '@/lib/tutorial-testmode-events'

interface TestModeContextType {
  isTestMode: boolean
  enableTestMode: () => void
  disableTestMode: () => void
  showExitConfirm: boolean
  setShowExitConfirm: (show: boolean) => void
}

const TEST_MODE_CHANNEL = 'plu_planner_testmode_sync'

const TestModeContext = createContext<TestModeContextType>({
  isTestMode: false,
  enableTestMode: () => {},
  disableTestMode: () => {},
  showExitConfirm: false,
  setShowExitConfirm: () => {},
})

/**
 * Testmodus-Provider – ermoeglicht einen Sandbox-Modus im Frontend.
 * Alle Backend-Writes (Edge Functions, REST-Mutations, supabase.from().insert/update/delete)
 * werden blockiert. invalidateQueries wird im Testmodus unterdrueckt, damit keine
 * Server-Refetches die lokalen Fake-Aenderungen ueberschreiben.
 * Beim Beenden wird der Cache auf den Snapshot zurueckgesetzt und alle Queries
 * werden neu vom Backend geladen.
 */
export function TestModeProvider({ children }: { children: ReactNode }) {
  const [isTestMode, setIsTestMode] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const queryClient = useQueryClient()
  const cacheSnapshot = useRef<Array<{ queryKey: readonly unknown[]; data: unknown }> | null>(null)
  const originalInvalidate = useRef<typeof queryClient.invalidateQueries | null>(null)
  const originalRefetch = useRef<typeof queryClient.refetchQueries | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const isBroadcasting = useRef(false)

  const enableTestMode = useCallback(() => {
    const cache = queryClient.getQueryCache().getAll()
    cacheSnapshot.current = cache.map(query => ({
      queryKey: query.queryKey,
      data: structuredClone(query.state.data),
    }))

    setTestModeFlag(true)
    flushSync(() => {
      setIsTestMode(true)
    })
    toast.info('Testmodus aktiviert – Änderungen werden nicht gespeichert.')
    if (!isBroadcasting.current) {
      channelRef.current?.postMessage({ type: 'TESTMODE_ON' })
    }
  }, [queryClient])

  // invalidate/refetch patchen: TanStack QueryClient bietet keinen eingebauten „keine Invalidation“-Modus;
  // kurzzeitiges Ersetzen der Methoden verhindert Server-Refetches im Testmodus (Layout-Effect, nicht im Render).
  useLayoutEffect(() => {
    if (!isTestMode) return

    originalInvalidate.current = queryClient.invalidateQueries.bind(queryClient)
    originalRefetch.current = queryClient.refetchQueries.bind(queryClient)
    // TanStack QueryClient: kein eingebauter Modus „Invalidation aus“; nur fuer Testmodus.
    // eslint-disable-next-line react-hooks/immutability -- kurzzeitiger Methoden-Tausch (siehe Kommentar oben)
    queryClient.invalidateQueries = () => Promise.resolve()
    queryClient.refetchQueries = (() => Promise.resolve()) as typeof queryClient.refetchQueries

    return () => {
      if (originalInvalidate.current) {
        queryClient.invalidateQueries = originalInvalidate.current
      }
      if (originalRefetch.current) {
        queryClient.refetchQueries = originalRefetch.current
      }
      originalInvalidate.current = null
      originalRefetch.current = null
    }
  }, [isTestMode, queryClient])

  const disableTestMode = useCallback(() => {
    setTestModeFlag(false)

    if (cacheSnapshot.current) {
      for (const { queryKey, data } of cacheSnapshot.current) {
        queryClient.setQueryData(queryKey, data)
      }
    }

    cacheSnapshot.current = null
    flushSync(() => {
      setIsTestMode(false)
      setShowExitConfirm(false)
    })

    queueMicrotask(() => {
      queryClient.invalidateQueries()
    })
    toast.success('Testmodus beendet – echte Daten wiederhergestellt.')
    if (!isBroadcasting.current) {
      channelRef.current?.postMessage({ type: 'TESTMODE_OFF' })
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TUTORIAL_TESTMODE_TURNED_OFF_EVENT))
    }
  }, [queryClient])

  // BroadcastChannel: Testmodus in anderen Tabs synchronisieren
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    try {
      channelRef.current = new BroadcastChannel(TEST_MODE_CHANNEL)
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'TESTMODE_ON') {
          isBroadcasting.current = true
          enableTestMode()
          isBroadcasting.current = false
        } else if (event.data?.type === 'TESTMODE_OFF') {
          isBroadcasting.current = true
          disableTestMode()
          isBroadcasting.current = false
        }
      }
    } catch {
      // BroadcastChannel nicht verfuegbar (z.B. aeltere Browser, Private Browsing)
    }
    return () => {
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [enableTestMode, disableTestMode])

  const value = useMemo(() => ({
    isTestMode,
    enableTestMode,
    disableTestMode,
    showExitConfirm,
    setShowExitConfirm,
  }), [isTestMode, enableTestMode, disableTestMode, showExitConfirm])

  return (
    <TestModeContext.Provider value={value}>
      {children}
    </TestModeContext.Provider>
  )
}

export function useTestMode() { // eslint-disable-line react-refresh/only-export-components
  return useContext(TestModeContext)
}
