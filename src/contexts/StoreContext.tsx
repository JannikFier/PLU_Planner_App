import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { extractSubdomain, isAdminSubdomain } from '@/lib/subdomain'

interface StoreContextType {
  currentStoreId: string | null
  currentCompanyId: string | null
  isAdminDomain: boolean
  storeName: string | null
  storeLogo: string | null
  companyName: string | null
  companyLogo: string | null
  subdomain: string | null
  isLoading: boolean
  error: string | null
  setActiveStore: (storeId: string) => void
}

const StoreContext = createContext<StoreContextType>({
  currentStoreId: null,
  currentCompanyId: null,
  isAdminDomain: false,
  storeName: null,
  storeLogo: null,
  companyName: null,
  companyLogo: null,
  subdomain: null,
  isLoading: true,
  error: null,
  setActiveStore: () => {},
})

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'localhost'

interface StoreState {
  currentStoreId: string | null
  currentCompanyId: string | null
  isAdminDomain: boolean
  storeName: string | null
  storeLogo: string | null
  companyName: string | null
  companyLogo: string | null
  subdomain: string | null
  isLoading: boolean
  error: string | null
}

const INITIAL_STATE: StoreState = {
  currentStoreId: null,
  currentCompanyId: null,
  isAdminDomain: false,
  storeName: null,
  storeLogo: null,
  companyName: null,
  companyLogo: null,
  subdomain: null,
  isLoading: true,
  error: null,
}

interface StoreRow {
  id: string
  company_id: string
  name: string
  subdomain: string
  logo_url: string | null
  is_active: boolean
}

/**
 * Laedt Store-Infos anhand einer Store-ID.
 * Gibt nur die Store-Daten zurueck – Company wird separat (non-blocking) geladen.
 */
async function loadStoreRow(storeId: string): Promise<StoreRow | null> {
  const { data: store, error } = await supabase
    .from('stores' as never)
    .select('id, company_id, name, subdomain, logo_url, is_active')
    .eq('id', storeId)
    .single()

  if (error || !store) return null

  const s = store as StoreRow
  if (!s.is_active) return null
  return s
}

function storeRowToState(s: StoreRow): StoreState {
  return {
    currentStoreId: s.id,
    currentCompanyId: s.company_id,
    isAdminDomain: false,
    storeName: s.name,
    storeLogo: s.logo_url,
    companyName: null,
    companyLogo: null,
    subdomain: s.subdomain,
    isLoading: false,
    error: null,
  }
}

/** Schreibt current_store_id in die DB (fire-and-forget). */
async function syncCurrentStoreToDb(storeId: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  await supabase
    .from('profiles' as never)
    .update({ current_store_id: storeId } as never)
    .eq('id', session.user.id)
}

/** Company-Daten nachladen und State ergaenzen (non-blocking). */
function loadCompanyInBackground(
  companyId: string,
  setState: React.Dispatch<React.SetStateAction<StoreState>>,
) {
  void (async () => {
    try {
      const { data } = await supabase
        .from('companies' as never)
        .select('id, name, logo_url')
        .eq('id', companyId)
        .single()
      const c = data as { id: string; name: string; logo_url: string | null } | null
      if (c) {
        setState(prev => ({ ...prev, companyName: c.name, companyLogo: c.logo_url }))
      }
    } catch { /* non-critical */ }
  })()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(INITIAL_STATE)
  const resolvedBySubdomain = useRef(false)
  const fallbackTriggered = useRef(false)

  // --- Schritt 1: Subdomain-basierte Aufloesung (sofort bei Mount) ---
  useEffect(() => {
    resolveBySubdomain()
  }, [])

  async function resolveBySubdomain() {
    try {
      const params = new URLSearchParams(window.location.search)
      const devOverride = import.meta.env.DEV ? params.get('store') : null
      const subdomain = devOverride || extractSubdomain(window.location.hostname, APP_DOMAIN)

      if (!subdomain) {
        // Kein Subdomain → Fallback wird durch Auth-Listener erledigt
        return
      }

      if (isAdminSubdomain(subdomain)) {
        resolvedBySubdomain.current = true
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAdminDomain: true,
          subdomain: 'admin',
        }))
        return
      }

      const { data: store, error } = await supabase
        .from('stores' as never)
        .select('id, company_id, name, subdomain, logo_url, is_active')
        .eq('subdomain', subdomain)
        .single()

      if (error || !store) {
        resolvedBySubdomain.current = true
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Markt "${subdomain}" wurde nicht gefunden.`,
          subdomain,
        }))
        return
      }

      const s = store as StoreRow

      if (!s.is_active) {
        resolvedBySubdomain.current = true
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Dieser Markt ist derzeit nicht verfügbar.',
          subdomain,
          storeName: s.name,
        }))
        return
      }

      resolvedBySubdomain.current = true
      setState(storeRowToState(s))
      loadCompanyInBackground(s.company_id, setState)
      syncCurrentStoreToDb(s.id)
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Markt konnte nicht geladen werden.',
      }))
    }
  }

  // --- Schritt 2: Auth-Listener fuer Fallback (kein Subdomain) ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (resolvedBySubdomain.current) return
        if (fallbackTriggered.current) return

        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          fallbackTriggered.current = true
          await resolveByProfile(session.user.id)
        }

        if (event === 'SIGNED_OUT') {
          fallbackTriggered.current = false
          setState({ ...INITIAL_STATE, isLoading: false })
        }
      },
    )
    return () => subscription.unsubscribe()
  }, [])

  async function resolveByProfile(userId: string) {
    try {
      // 1. profiles.current_store_id pruefen
      const { data: profile } = await supabase
        .from('profiles' as never)
        .select('current_store_id')
        .eq('id', userId)
        .single()

      const profileStoreId = (profile as { current_store_id: string | null } | null)?.current_store_id

      if (profileStoreId) {
        const row = await loadStoreRow(profileStoreId)
        if (row) {
          setState(storeRowToState(row))
          loadCompanyInBackground(row.company_id, setState)
          return
        }
      }

      // 2. Erster Store aus user_store_access
      const { data: accessRow } = await supabase
        .from('user_store_access' as never)
        .select('store_id')
        .eq('user_id', userId)
        .limit(1)
        .single()

      const accessStoreId = (accessRow as { store_id: string } | null)?.store_id
      if (accessStoreId) {
        const row = await loadStoreRow(accessStoreId)
        if (row) {
          const newState = storeRowToState(row)
          setState(newState)
          loadCompanyInBackground(row.company_id, setState)
          syncCurrentStoreToDb(accessStoreId)
          return
        }
      }

      // 3. Fallback fuer Super-Admins: erster aktiver Store
      const { data: firstStore } = await supabase
        .from('stores' as never)
        .select('id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const firstStoreId = (firstStore as { id: string } | null)?.id
      if (firstStoreId) {
        const row = await loadStoreRow(firstStoreId)
        if (row) {
          setState(storeRowToState(row))
          loadCompanyInBackground(row.company_id, setState)
          syncCurrentStoreToDb(firstStoreId)
          return
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Kein Markt verfügbar.',
      }))
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Markt konnte nicht geladen werden.',
      }))
    }
  }

  const setActiveStore = useCallback(async (storeId: string) => {
    const row = await loadStoreRow(storeId)
    if (row) {
      setState(storeRowToState(row))
      loadCompanyInBackground(row.company_id, setState)
      syncCurrentStoreToDb(storeId)
    }
  }, [])

  return (
    <StoreContext.Provider value={{ ...state, setActiveStore }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStoreContext() {
  return useContext(StoreContext)
}
