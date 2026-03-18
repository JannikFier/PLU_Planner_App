import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTestMode } from '@/contexts/TestModeContext'
import { toast } from 'sonner'

interface UseAppMutationParams<TData, TVariables> {
  mutationFn: (variables: TVariables, context: { queryClient: unknown }) => Promise<TData>
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Wrapper um useMutation der im Testmodus Mutationen abfaengt.
 * Im Testmodus werden Backend-Writes durch den globalen Flag in supabase.ts blockiert –
 * der Call geht zwar durch, gibt aber sofort Fake-Erfolg zurueck.
 */
export function useAppMutation<TData = unknown, TVariables = void>(
  options: UseAppMutationParams<TData, TVariables>,
) {
  const { isTestMode } = useTestMode()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (isTestMode) {
        toast.info('Testmodus: Änderung nur lokal angewendet.', { duration: 2000 })
        return undefined as TData
      }

      return options.mutationFn(variables, { queryClient })
    },
    onSuccess: options.onSuccess,
    onError: options.onError ?? ((error: Error) => {
      toast.error(`Fehler: ${error.message}`)
    }),
  })
}
