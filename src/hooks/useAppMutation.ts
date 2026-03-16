import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTestMode } from '@/contexts/TestModeContext'
import { toast } from 'sonner'

interface UseAppMutationParams<TData, TVariables> {
  mutationFn: (variables: TVariables, context: { queryClient: unknown }) => Promise<TData>
  onSuccess?: () => void
  onError?: (error: Error) => void
  /** Im Testmodus: Welche QueryKeys sollen invalidiert werden? */
  testModeQueryKeys?: unknown[][]
}

/**
 * Wrapper um useMutation der im Testmodus Mutationen abfaengt.
 * Im Testmodus wird KEIN API-Call gemacht – stattdessen wird
 * ein Toast angezeigt und die QueryKeys invalidiert.
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

        if (options.testModeQueryKeys) {
          for (const key of options.testModeQueryKeys) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        }

        return undefined as TData
      }

      return options.mutationFn(variables, { queryClient })
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
  })
}
