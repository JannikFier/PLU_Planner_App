import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { isAbortError } from '@/lib/error-utils'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import type { User, Session } from '@supabase/supabase-js'
import type { Database, Profile } from '@/types/database'

/** Auth-State – eine einzige Quelle für die gesamte App */
export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  /** true für super_admin UND admin (abwärtskompatibel) */
  isAdmin: boolean
  /** true NUR für super_admin (Inhaber) */
  isSuperAdmin: boolean
  /** true NUR für viewer (nur Liste + PDF) */
  isViewer: boolean
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
    isViewer: profile?.role === 'viewer',
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
    isViewer: false,
    mustChangePassword: false,
    isLoading: true,
    error: null,
  })

  const PROFILE_CACHE_KEY = 'plu_planner_profile'
  const SESSION_CACHE_KEY = 'plu_planner_session'
  const FETCH_PROFILE_TIMEOUT = 8000
  /** true wenn wir in diesem Init bereits aus Cache angezeigt haben – dann getSession-Update minimal halten */
  const displayedFromCacheRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const fetchOnce = async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        const err = error as { message?: string; cause?: unknown }
        const isAbort = isAbortError(err) || isAbortError(err.cause) || (err.message?.includes?.('AbortError') ?? false)
        if (!isAbort) {
          toast.error('Profil laden fehlgeschlagen: ' + (error?.message ?? 'Unbekannter Fehler'))
        }
        throw error
      }
      const profile = data as Profile
      try {
        sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }))
      } catch {
        // sessionStorage voll oder nicht verfügbar – ignorieren
      }
      return profile
    }

    try {
      const result = await Promise.race([
        withRetryOnAbort(fetchOnce),
        new Promise<null>((r) => setTimeout(() => r(null), FETCH_PROFILE_TIMEOUT)),
      ])
      return result
    } catch (e) {
      toast.error('Profil laden fehlgeschlagen: ' + (e instanceof Error ? e.message : 'Unbekannter Fehler'))
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    displayedFromCacheRef.current = false

    const runGetSessionAndContinue = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          const userId = session.user.id
          try {
            sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ userId, email: session.user.email ?? '' }))
          } catch {
            // ignorieren
          }
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

          if (cached && mounted && displayedFromCacheRef.current) {
            // Bereits aus Cache angezeigt – nur Session nachziehen, kein voller Re-Render mit gleichen Profildaten
            setState((prev) => ({ ...prev, session }))
            return
          }

          if (cached && mounted) {
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, cached!.profile),
              isLoading: false,
              error: null,
            }))
          }

          if (!displayedFromCacheRef.current) {
            const profile = await fetchProfile(userId)
            if (!mounted) return
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, profile),
              isLoading: false,
              error: null,
            }))
          }
        } else if (mounted) {
          try {
            sessionStorage.removeItem(SESSION_CACHE_KEY)
          } catch {
            // ignorieren
          }
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

    const initAuth = () => {
      try {
        let cachedProfile: { userId: string; profile: Profile } | null = null
        let cachedSession: { userId: string; email: string } | null = null
        try {
          const profileRaw = sessionStorage.getItem(PROFILE_CACHE_KEY)
          const sessionRaw = sessionStorage.getItem(SESSION_CACHE_KEY)
          if (profileRaw) {
            const parsed = JSON.parse(profileRaw) as { userId: string; profile: Profile }
            if (parsed.userId && parsed.profile) cachedProfile = parsed
          }
          if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw) as { userId: string; email: string }
            if (parsed.userId) cachedSession = parsed
          }
        } catch {
          // Cache ungültig – ignorieren
        }

        if (cachedProfile && cachedSession && cachedProfile.userId === cachedSession.userId && mounted) {
          displayedFromCacheRef.current = true
          const minimalUser = { id: cachedProfile.userId, email: cachedSession.email ?? '' } as User
          setState((prev) => ({
            ...prev,
            ...authReducer(minimalUser, null, cachedProfile.profile),
            isLoading: false,
            error: null,
          }))
          // getSession erst im Idle ausführen, damit Lazy-Chunks und First Paint Priorität haben
          let scheduled = false
          const runOnce = () => {
            if (scheduled) return
            scheduled = true
            clearTimeout(timeoutId)
            if (typeof cancelIdleCallback !== 'undefined' && idleId !== undefined) cancelIdleCallback(idleId)
            void runGetSessionAndContinue()
          }
          const timeoutId = setTimeout(runOnce, 120)
          const idleId =
            typeof requestIdleCallback !== 'undefined'
              ? requestIdleCallback(runOnce, { timeout: 2000 })
              : undefined
          return
        }

        void runGetSessionAndContinue()
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
            const userId = session.user.id
            let profile = await fetchProfile(userId)
            if (!mounted) return
            if (!profile) {
              try {
                const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
                if (raw) {
                  const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
                  if (parsed.userId === userId && parsed.profile) profile = parsed.profile
                }
              } catch {
                /* Cache ungültig */
              }
            }
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, profile),
              isLoading: false,
              error: null,
            }))
          } else if (event === 'SIGNED_OUT') {
          try {
            sessionStorage.removeItem(PROFILE_CACHE_KEY)
            sessionStorage.removeItem(SESSION_CACHE_KEY)
          } catch {
            // ignorieren
          }
          setState({
            user: null,
            session: null,
            profile: null,
            isAdmin: false,
            isSuperAdmin: false,
            isViewer: false,
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

    const LOGIN_TIMEOUT = 15000
    const loginTask = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw { type: 'auth' as const, error }
      if (!data?.session?.user) throw { type: 'no_session' as const }
      let profile = await fetchProfile(data.session.user.id)
      if (!profile) {
        try {
          const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
            if (parsed.userId === data.session.user.id && parsed.profile) profile = parsed.profile
          }
        } catch {
          /* Cache ungültig */
        }
      }
      return { session: data.session, user: data.session.user, profile }
    }

    try {
      const result = await Promise.race([
        loginTask(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), LOGIN_TIMEOUT)
        ),
      ])
      setState((prev) => ({
        ...prev,
        ...authReducer(result.user, result.session, result.profile),
        isLoading: false,
        error: null,
      }))
      return
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'TIMEOUT') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Verbindung dauert zu lange. Bitte prüfe deine Internetverbindung.',
        }))
        return
      }
      const err = e as { type?: string }
      const userMessage =
        err?.type === 'auth' || err?.type === 'no_session'
          ? 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
          : 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }))
      throw new Error(userMessage)
    }
  }, [fetchProfile])

  const loginWithPersonalnummer = useCallback(async (personalnummer: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    // RPC: Args-Typ aus Database['public']['Functions']['lookup_email_by_personalnummer']['Args']
    const { data: email, error: lookupError } = await supabase.rpc(
      'lookup_email_by_personalnummer',
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
        .update(
          ({ must_change_password: false } as Database['public']['Tables']['profiles']['Update']) as never
        )
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
