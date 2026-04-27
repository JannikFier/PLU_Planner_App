import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  defaultTutorialState,
  parseTutorialState,
  type TutorialStatePayload,
} from '@/lib/tutorial-types'

function rowStateToPayload(state: unknown): TutorialStatePayload {
  return parseTutorialState(state)
}

export function useTutorialPersistence(userId: string | undefined, storeId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['user-tutorial-state', userId, storeId],
    queryFn: async () => {
      if (!userId || !storeId) return null
      const { data, error } = await supabase
        .from('user_tutorial_state')
        .select('state')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .maybeSingle()
      if (error) throw error
      if (!data) return defaultTutorialState()
      return rowStateToPayload((data as { state: unknown }).state)
    },
    enabled: Boolean(userId && storeId),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: async (next: TutorialStatePayload) => {
      if (!userId || !storeId) throw new Error('Tutorial: fehlender User oder Markt.')
      const { error } = await supabase.from('user_tutorial_state').upsert(
        {
          user_id: userId,
          store_id: storeId,
          state: next,
        } as never,
        { onConflict: 'user_id,store_id' } as never,
      )
      if (error) throw error
    },
    onSuccess: async (_, next) => {
      await qc.invalidateQueries({ queryKey: ['user-tutorial-state', userId, storeId] })
      qc.setQueryData(['user-tutorial-state', userId, storeId], next)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return {
    payload: query.data ?? null,
    isLoading: query.isLoading,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    refetch: query.refetch,
  }
}
