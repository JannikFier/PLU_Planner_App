import { QueryClient } from '@tanstack/react-query'
import { isAbortError } from '@/lib/error-utils'

/** Wie in App: Persist maxAge – gcTime der Queries mindestens so hoch halten */
export const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 // 24 Stunden

/**
 * Ein gemeinsamer QueryClient für PersistQueryClientProvider und Auth (Logout).
 * Beim Abmelden wird der Cache geleert, damit nach Nutzerwechsel keine RLS-gefilterten
 * Daten (z. B. nur eine Firma für Admin) als Super-Admin stehen bleiben.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: CACHE_MAX_AGE_MS,
      retry: (failureCount, error) => {
        if (isAbortError(error)) return failureCount < 2
        return failureCount < 1
      },
      retryDelay: (attemptIndex) => Math.min(150 + attemptIndex * 150, 600),
      refetchOnWindowFocus: false,
    },
  },
})
