import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { supabase, clearSupabaseAuthStorage, getSessionDeduped } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { isAbortError } from '@/lib/error-utils'
import { withRetryOnAbort } from '@/lib/supabase-retry'
import { clearDeferReplayWelcome } from '@/lib/tutorial-replay-session'
import { loginEmailSchema, loginPersonalnummerSchema } from '@/lib/validation'
import type { User, Session } from '@supabase/supabase-js'
import type { Database, Profile } from '@/types/database'

/** PostgREST: RPC get_my_profile noch nicht deployed oder Schema-Cache. */
function isGetMyProfileRpcMissingError(error: { code?: string; message?: string }): boolean {
  const code = String(error.code ?? '')
  const msg = (error.message ?? '').toLowerCase()
  return (
    code === 'PGRST202'
    || code === '42883'
    || msg.includes('could not find the function')
    || msg.includes('get_my_profile')
  )
}

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
  /** true NUR für Kassenmodus (nur Leselisten) */
  isKiosk: boolean
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
  clearError: () => void
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
    isKiosk: profile?.role === 'kiosk',
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
    isKiosk: false,
    mustChangePassword: false,
    isLoading: true,
    error: null,
  })

  const PROFILE_CACHE_KEY = 'plu_planner_profile'
  const SESSION_CACHE_KEY = 'plu_planner_session'
  /** Gesamtbudget inkl. Retries (Hard-Fallback per JWT in fetchProfile faengt Cookie-Storage-Hänger ab). */
  const FETCH_PROFILE_TIMEOUT = 12_000
  const PROFILE_ERROR_TOAST_DELAY_MS = 1500
  /** RLS-Sichtbarkeits-Race kurz absichern (nicht mehr Storage-Race – das wird per accessToken-Fallback geloest). */
  const PROFILE_FETCH_EMPTY_RETRIES = 3
  const PROFILE_FETCH_EMPTY_DELAY_MS = 200
  /** true wenn wir in diesem Init bereits aus Cache angezeigt haben – dann getSession-Update minimal halten */
  const displayedFromCacheRef = useRef(false)
  /** Timeout für verzögerten Profil-Fehler-Toast; wird gecleart sobald ein Profil gesetzt wird */
  const profileErrorToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearProfileErrorToast = useCallback(() => {
    if (profileErrorToastTimeoutRef.current != null) {
      clearTimeout(profileErrorToastTimeoutRef.current)
      profileErrorToastTimeoutRef.current = null
    }
  }, [])

  /** State „nicht eingeloggt“ + Cache leeren. Wird genutzt wenn Auth-Check fehlschlägt oder abgebrochen wird (z. B. anderer Tab) – dann immer zum Login. */
  const setLoggedOutAndClearCache = useCallback(() => {
    try {
      sessionStorage.removeItem(PROFILE_CACHE_KEY)
      sessionStorage.removeItem(SESSION_CACHE_KEY)
      // TanStack Query (RAM): leeren, damit nach Nutzerwechsel keine RLS-gefilterten Daten der vorherigen Rolle bleiben
      sessionStorage.removeItem('PLU_PLANNER_QUERY_CACHE')
      queryClient.clear()
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
      isKiosk: false,
      mustChangePassword: false,
      isLoading: false,
      error: null,
    })
  }, [])

  const fetchProfile = useCallback(async (
    userId: string,
    opts?: { accessToken?: string },
  ): Promise<Profile | null> => {
    clearProfileErrorToast()

    const scheduleProfileErrorToast = (msg: string) => {
      if (profileErrorToastTimeoutRef.current != null) clearTimeout(profileErrorToastTimeoutRef.current)
      profileErrorToastTimeoutRef.current = setTimeout(() => {
        profileErrorToastTimeoutRef.current = null
        toast.error(msg)
      }, PROFILE_ERROR_TOAST_DELAY_MS)
    }

    /** Hard-Fallback: direkter REST-Call mit explizitem JWT (umgeht Cookie-Storage-Race). */
    const callRpcDirect = async (jwt: string): Promise<Profile | null> => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_my_profile`
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
        if (!resp.ok) return null
        const json = await resp.json() as Profile | null
        if (json && typeof json === 'object' && !Array.isArray(json) && (json as Profile).id === userId) {
          return json as Profile
        }
        return null
      } catch {
        return null
      }
    }

    const fetchOnce = async (): Promise<Profile | null> => {
      const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
      const cacheAndReturn = (profile: Profile): Profile => {
        try {
          sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }))
        } catch {
          // sessionStorage voll oder nicht verfügbar – ignorieren
        }
        return profile
      }

      let rpcUnavailable = false
      let refreshedOnce = false

      for (let attempt = 0; attempt < PROFILE_FETCH_EMPTY_RETRIES; attempt++) {
        if (!rpcUnavailable) {
          const { data: rpcPayload, error: rpcError, status: rpcStatus } =
            await supabase.rpc('get_my_profile')

          // Erfolg
          if (!rpcError && rpcPayload != null && typeof rpcPayload === 'object' && !Array.isArray(rpcPayload)) {
            const profile = rpcPayload as Profile
            if (profile.id === userId) {
              return cacheAndReturn(profile)
            }
          }

          // 401: einmal Refresh, dann ggf. Hard-Fallback mit explizitem JWT
          if (rpcError && rpcStatus === 401) {
            if (!refreshedOnce) {
              refreshedOnce = true
              try { await supabase.auth.refreshSession() } catch { /* Refresh fehlgeschlagen */ }
              continue
            }
            if (opts?.accessToken) {
              const direct = await callRpcDirect(opts.accessToken)
              if (direct) return cacheAndReturn(direct)
            }
            scheduleProfileErrorToast('Profil laden fehlgeschlagen (Authentifizierung).')
            return null
          }

          // RPC fehlt (noch nicht deployed): einmalig auf REST-Fallback umschalten
          if (rpcError && isGetMyProfileRpcMissingError(rpcError)) {
            rpcUnavailable = true
          } else if (rpcError) {
            const err = rpcError as { message?: string; cause?: unknown }
            const isAbort =
              isAbortError(err) || isAbortError(err.cause) || (err.message?.includes?.('AbortError') ?? false)
            if (!isAbort) {
              scheduleProfileErrorToast('Profil laden fehlgeschlagen: ' + (rpcError?.message ?? 'Unbekannter Fehler'))
            }
            throw rpcError
          } else if (rpcPayload == null) {
            // Profil nicht sichtbar (RLS) oder fehlt: kurz retry, dann aufgeben
            if (attempt < PROFILE_FETCH_EMPTY_RETRIES - 1) {
              await sleep(PROFILE_FETCH_EMPTY_DELAY_MS)
              continue
            }
            // Wenn JWT bekannt ist: noch einmal direkt versuchen (umgeht Client-State).
            if (opts?.accessToken) {
              const direct = await callRpcDirect(opts.accessToken)
              if (direct) return cacheAndReturn(direct)
            }
            scheduleProfileErrorToast(
              'Kein Profil gefunden. Bitte Administrator kontaktieren oder erneut anmelden.',
            )
            return null
          }
        }

        // REST-Fallback: direktes Select aus profiles (RPC fehlt)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          const err = error as { message?: string; cause?: unknown }
          const isAbort = isAbortError(err) || isAbortError(err.cause) || (err.message?.includes?.('AbortError') ?? false)
          if (!isAbort) {
            scheduleProfileErrorToast('Profil laden fehlgeschlagen: ' + (error?.message ?? 'Unbekannter Fehler'))
          }
          throw error
        }

        if (data) {
          return cacheAndReturn(data as Profile)
        }

        if (attempt < PROFILE_FETCH_EMPTY_RETRIES - 1) {
          await sleep(PROFILE_FETCH_EMPTY_DELAY_MS)
          continue
        }
        scheduleProfileErrorToast(
          'Kein Profil gefunden. Bitte Administrator kontaktieren oder erneut anmelden.',
        )
        return null
      }
      return null
    }

    try {
      const result = await Promise.race([
        withRetryOnAbort(fetchOnce),
        new Promise<null>((r) => setTimeout(() => r(null), FETCH_PROFILE_TIMEOUT)),
      ])
      return result
    } catch (e) {
      if (!isAbortError(e)) {
        scheduleProfileErrorToast('Profil laden fehlgeschlagen: ' + (e instanceof Error ? e.message : 'Unbekannter Fehler'))
      }
      return null
    }
  }, [clearProfileErrorToast])

  useEffect(() => {
    let mounted = true
    displayedFromCacheRef.current = false

    const runGetSessionAndContinue = async () => {
      try {
        const { data: { session } } = await getSessionDeduped()

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
            void fetchProfile(userId, { accessToken: session.access_token }) // Hintergrund: Profil-Cache aktualisieren
            return
          }

          if (cached && mounted) {
            clearProfileErrorToast()
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, cached.profile),
              isLoading: false,
              error: null,
            }))
            // Profil aus sessionStorage bereits angezeigt: Netz-Refresh darf Init nicht blockieren (sonst ~FETCH_PROFILE_TIMEOUT)
            if (!displayedFromCacheRef.current) {
              void fetchProfile(userId, { accessToken: session.access_token }).then((fresh) => {
                if (!mounted || !fresh) return
                clearProfileErrorToast()
                setState((prev) => ({
                  ...prev,
                  ...authReducer(session.user, session, fresh),
                  isLoading: false,
                  error: null,
                }))
              })
            }
          } else if (!displayedFromCacheRef.current) {
            let profile = await fetchProfile(userId, { accessToken: session.access_token })
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
            if (!mounted) return
            if (profile) clearProfileErrorToast()
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, profile),
              isLoading: false,
              error: null,
            }))
          }
        } else if (mounted) {
          // getSession() erfolgreich, aber keine Session (z. B. in anderem Tab ausgeloggt) → Cache leeren, ausloggen
          setLoggedOutAndClearCache()
        }
      } catch {
        if (!mounted) return
        // Netzwerkfehler/Timeout: nicht ausloggen, nur Loading beenden – User bleibt mit Cache eingeloggt
        setState((prev) => ({ ...prev, isLoading: false }))
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
          clearProfileErrorToast()
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
          const timeoutId = setTimeout(runOnce, 50)
          const idleId =
            typeof requestIdleCallback !== 'undefined'
              ? requestIdleCallback(runOnce, { timeout: 2000 })
              : undefined
          return
        }

        void runGetSessionAndContinue()
      } catch {
        if (!mounted) return
        // Auth-Check fehlgeschlagen oder abgebrochen → ausloggen, Redirect zum Login
        setLoggedOutAndClearCache()
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        try {
          if (event === 'SIGNED_IN' && session?.user) {
            const userId = session.user.id

            // Idempotenz: wenn loginWithEmail das Profil fuer diesen User gerade gesetzt
            // hat (Cache-Hit), nur Session nachziehen statt Doppel-Fetch.
            let cachedProfile: Profile | null = null
            try {
              const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
              if (raw) {
                const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
                if (parsed.userId === userId && parsed.profile) cachedProfile = parsed.profile
              }
            } catch { /* Cache ungueltig */ }

            if (cachedProfile) {
              clearProfileErrorToast()
              setState((prev) => ({
                ...prev,
                ...authReducer(session.user, session, cachedProfile),
                isLoading: false,
                error: null,
              }))
              return
            }

            if (session.access_token && session.refresh_token) {
              const { error: setErr } = await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              })
              if (setErr) console.error('[Auth] setSession bei SIGNED_IN:', setErr)
            }
            const profile = await fetchProfile(userId, { accessToken: session.access_token })
            if (!mounted) return
            if (profile) clearProfileErrorToast()
            setState((prev) => ({
              ...prev,
              ...authReducer(session.user, session, profile),
              isLoading: false,
              error: null,
            }))
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            setState((prev) => ({ ...prev, session }))
            try {
              // userId + email fuer initAuth-Cache beibehalten (nicht mit access_token ueberschreiben)
              sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                userId: session.user.id,
                email: session.user.email ?? '',
              }))
            } catch { /* ignorieren */ }
          } else if (event === 'INITIAL_SESSION' && session?.user) {
            // Wenn der Cache bereits angezeigt wurde, nicht erneut fetchen – runGetSessionAndContinue erledigt das
            if (displayedFromCacheRef.current) return
            const userId = session.user.id
            let profile = await fetchProfile(userId, { accessToken: session.access_token })
            if (!mounted) return
            if (!profile) {
              try {
                const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
                if (raw) {
                  const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
                  if (parsed.userId === userId && parsed.profile) profile = parsed.profile
                }
              } catch { /* Cache ungültig */ }
            }
            if (profile) clearProfileErrorToast()
            setState((prev) => {
              // Wenn inzwischen (durch runGetSessionAndContinue) bereits ein Profil gesetzt wurde, nicht ueberschreiben
              if (prev.profile) return prev
              return {
                ...prev,
                ...authReducer(session.user, session, profile),
                isLoading: false,
                error: null,
              }
            })
          } else if (event === 'SIGNED_OUT') {
          try {
            sessionStorage.removeItem(PROFILE_CACHE_KEY)
            sessionStorage.removeItem(SESSION_CACHE_KEY)
            sessionStorage.removeItem('PLU_PLANNER_QUERY_CACHE')
            clearDeferReplayWelcome()
            queryClient.clear()
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
            isKiosk: false,
            mustChangePassword: false,
            isLoading: false,
            error: null,
          })
        }
        } catch {
          if (mounted) {
            // Auth-Update fehlgeschlagen oder abgebrochen → ausloggen, Redirect zum Login
            setLoggedOutAndClearCache()
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, setLoggedOutAndClearCache, clearProfileErrorToast])

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const parsed = loginEmailSchema.safeParse({ email, password })
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Ungültige Eingabe'
      setState((prev) => ({ ...prev, error: msg }))
      throw new Error(msg)
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    const LOGIN_TIMEOUT = 25_000
    const loginTask = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw { type: 'auth' as const, error }
      if (!data?.session?.user) throw { type: 'no_session' as const }
      // Session explizit setzen (wichtig bei Cookie-Speicher / Subdomain-Wechsel), damit REST sofort das JWT nutzt.
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      if (setSessionError) {
        console.error('[Auth] setSession nach Login:', setSessionError)
      }
      const uid = data.session.user.id
      // Profil blockierend laden; accessToken als Hard-Fallback wenn Cookie-Storage racy ist.
      let profile = await fetchProfile(uid, { accessToken: data.session.access_token })
      if (!profile) {
        try {
          const raw = sessionStorage.getItem(PROFILE_CACHE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as { userId: string; profile: Profile }
            if (parsed.userId === uid && parsed.profile) profile = parsed.profile
          }
        } catch {
          /* Cache ungueltig */
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
      if (result.profile) clearProfileErrorToast()
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
      const err = e as { type?: string; error?: { message?: string } }
      const supabaseMsg = err?.error?.message?.toLowerCase() ?? ''
      let userMessage: string
      if (err?.type === 'auth' || err?.type === 'no_session') {
        if (
          supabaseMsg.includes('invalid login credentials') ||
          supabaseMsg.includes('invalid_credentials')
        ) {
          userMessage = 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
        } else if (supabaseMsg.includes('email not confirmed')) {
          userMessage = 'Bitte bestätige zuerst deine E-Mail-Adresse.'
        } else if (supabaseMsg.includes('too many') || supabaseMsg.includes('rate')) {
          userMessage = 'Zu viele Anmeldeversuche. Bitte warte einen Moment.'
        } else {
          userMessage = 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
          console.error('[Auth] Supabase-Fehler:', err?.error)
        }
      } else {
        userMessage = 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.'
        console.error('[Auth] Login-Fehler:', e)
      }
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }))
      throw new Error(userMessage)
    }
  }, [fetchProfile, clearProfileErrorToast])

  const loginWithPersonalnummer = useCallback(async (personalnummer: string, password: string) => {
    const parsed = loginPersonalnummerSchema.safeParse({ personalnummer, password })
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Ungültige Eingabe'
      setState((prev) => ({ ...prev, error: msg }))
      throw new Error(msg)
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    // RPC: Args-Typ aus Database['public']['Functions']['lookup_email_by_personalnummer']['Args']
    const { data: email, error: lookupError } = await supabase.rpc(
      'lookup_email_by_personalnummer',
      { p_nummer: personalnummer } as never
    ) as { data: string | null; error: { message: string } | null }

    if (lookupError || !email) {
      const userMessage = 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }))
      throw new Error(userMessage)
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

      setState((prev) => {
        const updatedProfile = prev.profile ? { ...prev.profile, must_change_password: false } : null
        if (updatedProfile) {
          try {
            sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId: uid, profile: updatedProfile }))
          } catch { /* sessionStorage voll – ignorieren */ }
        }
        return {
          ...prev,
          mustChangePassword: false,
          profile: updatedProfile,
        }
      })
    }
  }, [state.user?.id])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    // Sofort: UI zuruecksetzen (optimistisches Logout)
    setLoggedOutAndClearCache()
    const LOGOUT_TIMEOUT_MS = 5000
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Logout-Timeout')), LOGOUT_TIMEOUT_MS),
        ),
      ])
    } catch {
      // signOut fehlgeschlagen (Netzwerk, Timeout) – Auth-Daten lokal loeschen
      clearSupabaseAuthStorage()
    }
  }, [setLoggedOutAndClearCache])

  const refreshProfile = useCallback(async () => {
    const uid = state.user?.id
    if (uid) {
      const profile = await fetchProfile(uid)
      if (profile) {
        clearProfileErrorToast()
        setState((prev) => ({
          ...prev,
          ...authReducer(prev.user, prev.session, profile),
        }))
      }
    }
  }, [state.user?.id, fetchProfile, clearProfileErrorToast])

  const clearError = useCallback(() => {
    setState((prev) => (prev.error ? { ...prev, error: null } : prev))
  }, [])

  const value: AuthContextValue = useMemo(() => ({
    ...state,
    loginWithEmail,
    loginWithPersonalnummer,
    changePassword,
    requestPasswordReset,
    logout,
    refreshProfile,
    clearError,
  }), [state, loginWithEmail, loginWithPersonalnummer, changePassword, requestPasswordReset, logout, refreshProfile, clearError])

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
