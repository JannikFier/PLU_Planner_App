import { createContext, useContext, type ReactNode } from 'react'

/** true = schlanke main-Shell ohne volle App; nach Login voller Seitenwechsel. */
const KasseBareBootstrapContext = createContext(false)

export function KasseBareBootstrapProvider({ children }: { children: ReactNode }) {
  return <KasseBareBootstrapContext.Provider value={true}>{children}</KasseBareBootstrapContext.Provider>
}

export function useKasseBareBootstrap(): boolean { // eslint-disable-line react-refresh/only-export-components
  return useContext(KasseBareBootstrapContext)
}
