import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invokeEdgeFunction } from '@/lib/supabase'

type Options = {
  /** Zusätzliche Query-Keys nach erfolgreicher Mutation invalidieren */
  extraInvalidatePrefixes?: readonly string[][]
}

/**
 * update-kiosk-register / delete-kiosk-register mit konsistenter Invalidierung.
 */
export function useKioskRegisterMutations(storeId: string | undefined, options: Options = {}) {
  const queryClient = useQueryClient()
  const extra = options.extraInvalidatePrefixes ?? []

  const invalidate = () => {
    if (storeId) {
      void queryClient.invalidateQueries({ queryKey: ['kiosk-registers', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['store-user-profiles', storeId] })
    }
    for (const key of extra) {
      void queryClient.invalidateQueries({ queryKey: [...key] })
    }
  }

  const updateRegisterMutation = useMutation({
    mutationFn: async (p: { register_id: string; password?: string; active?: boolean }) => {
      return invokeEdgeFunction('update-kiosk-register', p)
    },
    onSuccess: () => {
      toast.success('Gespeichert.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (registerId: string) => {
      await invokeEdgeFunction('delete-kiosk-register', { register_id: registerId })
    },
    onSuccess: () => {
      toast.success('Kasse gelöscht.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return { updateRegisterMutation, deleteMutation }
}
