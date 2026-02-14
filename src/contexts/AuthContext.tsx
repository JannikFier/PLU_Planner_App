import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

/** Auth-State – eine einzige Quelle für die gesamte App */
export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  /** true für super_admin UND admin (abwärtskompatibel) */
  isAdmin: boolean
  /** true NUR für super_admin (Inhaber) */
  isSuperAdmin: boolean
  /** true wenn User beim Login sein Passwort ändern muss */
  mustChangePassword: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  loginWithEmail: (email: string, password: string) => Promise<void>
  loginWithPersonalnummer: (personalnummer: string, password: string) => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const isAbortError = (err: unknown) =>
  err instanceof Error && (err.name === 'AbortError' || (err as { code?: string }).code === 'ABORT_ERR')

/** Auth-Logik zentral im Provider – State bleibt bei Navigation erhalten */
function authReducer(
  user: User | null,
  session: Session | null,
  profile: Profile | null
): Omit<AuthState, 'isLoading' | 'error'> {
  return {
    user,
    session,
    profile,
    isAdmin: profile?.role === 'super_admin' || profile?.role === 'admin',
    isSuperAdmin: profile?.role === 'super_admin',
    mustChangePassword: profile?.must_change_password ?? false,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isAdmin: false,
    isSuperAdmin: false,
    mustChangePassword: false,
    isLoading: true,
    error: null,
  })

  const PROFILE_CACHE_KEY = 'plu_planner_profile'

  const fetchProfile = useCallback(async (userId: string, retried = false): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        const err = error as { message?: string; cause?: unknown }
        const isAbort = isAbortError(err) || isAbortError(err.cause) || (err.message?.includes?.('AbortError') ?? false)
        if (isAbort && !retried) {
          await new Promise((r) => setTimeout(r, 120))
          return fetchProfile(userId, true)
        }
        if (!isAbort) {
          console.error('Profil laden fehlgeschlagen:', error)
        }
        return null
      }
      const profile = data as Profile
      try {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }))
      } catch {
        // sessionStorage voll oder nicht verfügbar – ignorieren
      }
      return profile
    } catch (e) {
      if (isAbortError(e) && !retried) {
        await new Promise((r) => setTimeout(r, 120))
        return fetchProfile(userId, true)
      }
      console.error('Profil laden fehlgeschlagen:', e)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          const userId = session.user.id
          // Sofort mit gecachtem Profil anzeigen (Reload = sofort drin), dann im Hintergrund aktualisieren
          let cached: { userId: string; profile: Profile } | null = null
          try {
            const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
            if (raw) {
              const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
              if (parsed.userId === userId && parsed.profile) cached = parsed
            }
          } catch {
            // Cache ungültig – ignorieren
          }

          if (cached && mounted) {
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, cached!.profile),
              isLoading: false,
              error: null,
            }))
          }

          // Immer frisches Profil nachladen (im Hintergrund, wenn Cache genutzt wurde)
          const profile = await fetchProfile(userId)
          if (!mounted) return
          setState((prev) => ({
            ...prev,
            ...authReducer(session.user, session, profile),
            isLoading: false,
            error: null,
          }))
        } else if (mounted) {
          setState((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (e) {
        if (!mounted) return
        if (isAbortError(e)) {
          setState((prev) => ({ ...prev, isLoading: false }))
          return
        }
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Auth-Initialisierung fehlgeschlagen',
        }))
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const profile = await fetchProfile(session.user.id)
            if (!mounted) return
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, profile),
              isLoading: false,
              error: null,
            }))
          } else if (event === 'SIGNED_OUT') {
          try {
            sessionStorage.removeItem(PROFILE_CACHE_KEY)
          } catch {
            // ignorieren
          }
          setState({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            isSuperAdmin: false,
            mustChangePassword: false,
            isLoading: false,
            error: null,
          })
        }
        } catch (e) {
          if (mounted && !isAbortError(e)) {
            setState((prev) => ({ ...prev, isLoading: false, error: 'Auth-Initialisierung fehlgeschlagen' }))
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    // #region agent log – Login-Flow
    const DEBUG_INGEST = 'http://127.0.0.1:7244/ingest/d1646c8f-788c-4220-8020-ca825d2ef16e'
    const log = (msg: string, d?: Record<string, unknown>) => {
      fetch(DEBUG_INGEST, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext:loginWithEmail', message: msg, data: d ?? {}, timestamp: Date.now(), hypothesisId: 'L1' }) }).catch(() => {})
    }
    log('signInWithPassword start')
    // #endregion

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    log('signInWithPassword done', { hasError: !!error, hasData: !!data, hasSession: !!data?.session, hasUser: !!data?.session?.user })

    if (error) {
      const userMessage = 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }))
      throw new Error(userMessage)
    }

    // Sofort State setzen mit Session aus Response – nicht auf onAuthStateChange warten (sonst hängt die UI)
    if (data?.session?.user) {
      log('fetchProfile start', { userId: data.session.user.id })
      const profile = await fetchProfile(data.session.user.id)
      log('fetchProfile done', { hasProfile: !!profile })
      setState((prev) => ({
        ...prev,
        ...authReducer(data.session!.user, data.session!, profile),
        isLoading: false,
        error: null,
      }))
    } else {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [fetchProfile])

  const loginWithPersonalnummer = useCallback(async (personalnummer: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    const { data: email, error: lookupError } = await supabase.rpc(
      'lookup_email_by_personalnummer' as never,
      { p_nummer: personalnummer } as never
    ) as { data: string | null; error: { message: string } | null }

    if (lookupError || !email) {
      const userMessage = 'Personalnummer nicht gefunden.'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }))
      throw new Error(lookupError?.message || userMessage)
    }

    return loginWithEmail(email, password)
  }, [loginWithEmail])

  const changePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error

    const uid = state.user?.id
    if (uid) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false } as never)
        .eq('id', uid)

      if (profileError) throw profileError

      setState((prev) => ({
        ...prev,
        mustChangePassword: false,
        profile: prev.profile ? { ...prev.profile, must_change_password: false } : null,
      }))
    }
  }, [state.user?.id])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    const uid = state.user?.id
    if (uid) {
      const profile = await fetchProfile(uid)
      if (profile) {
        setState((prev) => ({
          ...prev,
          ...authReducer(prev.user, prev.session, profile),
        }))
      }
    }
  }, [state.user?.id, fetchProfile])

  const value: AuthContextValue = {
    ...state,
    loginWithEmail,
    loginWithPersonalnummer,
    changePassword,
    requestPasswordReset,
    logout,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook-Export in Context-Datei gewollt
export function useAuth(): AuthContextValue { // eslint-disable-line react-refresh/only-export-components
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.')
  }
  return ctx
}
