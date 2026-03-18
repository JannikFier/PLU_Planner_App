import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { extractSubdomain, isAdminSubdomain } from '@/lib/subdomain'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/types/database'

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

const STORE_CACHE_KEY = 'plu_planner_store_cache'
const STORE_CHANNEL = 'plu_planner_store_sync'

function getCachedStoreState(): Partial<StoreState> | null {
  try {
    const raw = sessionStorage.getItem(STORE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<StoreState>
  } catch { return null }
}

function cacheStoreState(s: StoreState) {
  if (!s.currentStoreId) return
  try {
    sessionStorage.setItem(STORE_CACHE_KEY, JSON.stringify({
      currentStoreId: s.currentStoreId,
      currentCompanyId: s.currentCompanyId,
      storeName: s.storeName,
      storeLogo: s.storeLogo,
      companyName: s.companyName,
      companyLogo: s.companyLogo,
      subdomain: s.subdomain,
      isAdminDomain: s.isAdminDomain,
    }))
  } catch { /* sessionStorage voll */ }
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

/** Schreibt current_store_id in die DB (fire-and-forget). Fehler werden ignoriert – UI-State ist bereits gesetzt. */
async function syncCurrentStoreToDb(storeId: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase
      .from('profiles' as never)
      .update({ current_store_id: storeId } as never)
      .eq('id', session.user.id)

    if (error) {
      return
    }
  } catch {
    // Netzwerk oder anderer Fehler – nicht an Aufrufer weitergeben
  }
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
  const { user, profile, session, isLoading: authLoading } = useAuth()
  const [state, setStateRaw] = useState<StoreState>(() => {
    const cached = getCachedStoreState()
    if (cached?.currentStoreId) {
      return { ...INITIAL_STATE, ...cached, isLoading: false }
    }
    return INITIAL_STATE
  })
  const setState = useCallback((updater: StoreState | ((prev: StoreState) => StoreState)) => {
    setStateRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next.currentStoreId && !next.isLoading && !next.error) {
        cacheStoreState(next)
      }
      return next
    })
  }, [])
  const resolvedBySubdomain = useRef(false)
  const fallbackTriggered = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  /** Laedt Store-Daten und setzt State – ohne DB-Sync und ohne Broadcast (fuer Broadcast-Empfang). */
  const loadAndSetStore = useCallback(async (storeId: string): Promise<boolean> => {
    const row = await loadStoreRow(storeId)
    if (row) {
      setState(storeRowToState(row))
      loadCompanyInBackground(row.company_id, setState)
      return true
    }
    return false
  }, [])

  // BroadcastChannel: Store-Wechsel in anderen Tabs synchronisieren (nur bei expliziter User-Aktion)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    try {
      channelRef.current = new BroadcastChannel(STORE_CHANNEL)
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'STORE_CHANGED' && event.data?.storeId) {
          void loadAndSetStore(event.data.storeId)
        }
      }
    } catch {
      // BroadcastChannel nicht verfuegbar (z.B. aeltere Browser, Private Browsing)
    }
    return () => {
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [loadAndSetStore])

  const resolveByProfileFromAuth = useCallback(
    async (userId: string, authProfile: Profile | null) => {
      try {
        const profileStoreId = authProfile?.current_store_id ?? null
        const profileRole = authProfile?.role ?? null

        if (profileStoreId) {
          const row = await loadStoreRow(profileStoreId)
          if (row) {
            setState(storeRowToState(row))
            loadCompanyInBackground(row.company_id, setState)
            return
          }
        }

        const { data: accessRow } = await supabase
          .from('user_store_access' as never)
          .select('store_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle()

        const accessStoreId = (accessRow as { store_id: string } | null)?.store_id
        if (accessStoreId) {
          const row = await loadStoreRow(accessStoreId)
          if (row) {
            setState(storeRowToState(row))
            loadCompanyInBackground(row.company_id, setState)
            syncCurrentStoreToDb(accessStoreId)
            return
          }
        }

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

        if (profileRole === 'super_admin') {
          setState(prev => ({ ...prev, isLoading: false }))
          return
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
    },
    [],
  )

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
        setState(prev => ({
          ...prev,
          isAdminDomain: true,
          subdomain: 'admin',
        }))
        resolvedBySubdomain.current = true
        // Admin-Subdomain: Store wird durch Auth-basierten useEffect aufgeloest (user + profile)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setState(prev => ({ ...prev, isLoading: false }))
        }
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

  // --- Schritt 2: Auth-basierter Fallback (kein Subdomain ODER Admin-Subdomain ohne Store) ---
  useEffect(() => {
    if (!user?.id || !session) {
      // Kein User ODER Session noch nicht bestaetigt (z.B. Cache-Restore)
      // -> Keine Fetches, bis getSession() abgeschlossen ist (verhindert 406 bei abgelaufener Session)
      fallbackTriggered.current = false
      if (!user?.id && !authLoading) {
        try {
          sessionStorage.removeItem(STORE_CACHE_KEY)
        } catch {
          /* ignore */
        }
        setStateRaw({ ...INITIAL_STATE, isLoading: false })
      }
      return
    }
    if (resolvedBySubdomain.current && !state.isAdminDomain) return
    if (fallbackTriggered.current && state.currentStoreId) return
    if (!resolvedBySubdomain.current || (state.isAdminDomain && !state.currentStoreId)) {
      fallbackTriggered.current = true
      void resolveByProfileFromAuth(user.id, profile)
    }
  }, [user?.id, profile, session, authLoading, state.isAdminDomain, state.currentStoreId, resolveByProfileFromAuth])

  const setActiveStore = useCallback(async (storeId: string) => {
    const ok = await loadAndSetStore(storeId)
    if (ok) {
      syncCurrentStoreToDb(storeId)
      channelRef.current?.postMessage({ type: 'STORE_CHANGED', storeId })
    }
  }, [loadAndSetStore])

  const value = useMemo(() => ({ ...state, setActiveStore }), [state, setActiveStore])

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStoreContext() {
  return useContext(StoreContext)
}
