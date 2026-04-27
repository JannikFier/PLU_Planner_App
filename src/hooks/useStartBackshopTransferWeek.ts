import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useStartBackshopTransferWeek() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_backshop_transfer_week_started' as never)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Backshop-Transfer-Woche gestartet')
      void queryClient.invalidateQueries({ queryKey: ['backshop-versions'] })
      void queryClient.invalidateQueries({ queryKey: ['backshop-version', 'active'] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Konnte nicht setzen')
    },
  })
}
