import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { StoreListVisibility } from '@/types/database'
import { useCurrentStore } from '@/hooks/useCurrentStore'

export function useStoreListVisibility(storeId?: string) {
  const { currentStoreId } = useCurrentStore()
  const effectiveStoreId = storeId ?? currentStoreId

  return useQuery({
    queryKey: ['store-list-visibility', effectiveStoreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_list_visibility' as never)
        .select('*')
        .eq('store_id', effectiveStoreId!)
      if (error) throw error
      return data as unknown as StoreListVisibility[]
    },
    enabled: !!effectiveStoreId,
  })
}

export function useIsListVisible(listType: string) {
  const { data: visibility } = useStoreListVisibility()
  const entry = visibility?.find(v => v.list_type === listType)
  return entry?.is_visible ?? true
}

export function useUpdateStoreListVisibility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { storeId: string; listType: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('store_list_visibility' as never)
        .update({ is_visible: params.isVisible } as never)
        .eq('store_id', params.storeId)
        .eq('list_type', params.listType)
      if (error) throw error
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['store-list-visibility', params.storeId] })
      toast.success('Listen-Sichtbarkeit wurde aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
