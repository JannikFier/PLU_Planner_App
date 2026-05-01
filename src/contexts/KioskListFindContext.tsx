import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** KW-Zeile + Listenstatus fuer die Kiosk-Kopfzeile (rechts neben der Suche). */
export type KioskListHeaderSummary = {
  kwLine: string
  listStatus: 'active' | 'frozen'
}

type KioskListFindContextValue = {
  registerListFindHandler: (fn: (() => void) | null) => void
  triggerListFind: () => void
  headerSummary: KioskListHeaderSummary | null
  setHeaderSummary: (s: KioskListHeaderSummary | null) => void
}

const KioskListFindContext = createContext<KioskListFindContextValue | null>(null)

export function KioskListFindProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<(() => void) | null>(null)
  const [headerSummary, setHeaderSummary] = useState<KioskListHeaderSummary | null>(null)

  const registerListFindHandler = useCallback((fn: (() => void) | null) => {
    handlerRef.current = fn
  }, [])

  const triggerListFind = useCallback(() => {
    handlerRef.current?.()
  }, [])

  const value = useMemo(
    () => ({
      registerListFindHandler,
      triggerListFind,
      headerSummary,
      setHeaderSummary,
    }),
    [registerListFindHandler, triggerListFind, headerSummary],
  )

  return <KioskListFindContext.Provider value={value}>{children}</KioskListFindContext.Provider>
}

export function useKioskListFindControls() { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(KioskListFindContext)
  if (!ctx) {
    throw new Error('useKioskListFindControls nur innerhalb von KioskListFindProvider')
  }
  return ctx
}

/**
 * Registriert die Suche-in-Liste-Funktion fuer die Kiosk-Kopfzeile (nur wenn enabled).
 */
export function useRegisterKioskListFindInPage(open: () => void, enabled: boolean) { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(KioskListFindContext)
  useLayoutEffect(() => {
    if (!enabled || !ctx) return
    ctx.registerListFindHandler(open)
    return () => {
      ctx.registerListFindHandler(null)
    }
  }, [enabled, open, ctx])
}

/**
 * Meldet KW/Status an die Kiosk-Kopfzeile; bei enabled false oder Unmount wird geleert.
 */
export function useRegisterKioskListHeaderSummary( // eslint-disable-line react-refresh/only-export-components
  summary: KioskListHeaderSummary | null,
  enabled: boolean,
) {
  const ctx = useContext(KioskListFindContext)
  useLayoutEffect(() => {
    if (!ctx) return
    if (!enabled) {
      ctx.setHeaderSummary(null)
      return
    }
    ctx.setHeaderSummary(summary)
    return () => {
      ctx.setHeaderSummary(null)
    }
  }, [enabled, summary, ctx])
}
