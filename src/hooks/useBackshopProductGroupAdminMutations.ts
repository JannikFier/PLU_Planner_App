import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ClassifiedMemberKey } from '@/lib/backshop-product-group-member-picker'
import type { Database } from '@/types/database'
import { formatError } from '@/lib/error-messages'

export function useCreateManualBackshopProductGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ displayName, blockId }: { displayName: string; blockId: string | null }) => {
      const { data, error } = await supabase
        .from('backshop_product_groups')
        .insert({
          display_name: displayName,
          origin: 'manual',
          needs_review: true,
          block_id: blockId,
        } as Database['public']['Tables']['backshop_product_groups']['Insert'] as never)
        .select('id')
        .single()
      if (error) throw error
      return (data as { id: string }).id
    },
    onSuccess: () => {
      toast.success('Gruppe angelegt')
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })
}

export function useApplyBackshopProductGroupMembers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, items }: { groupId: string; items: ClassifiedMemberKey[] }) => {
      for (const t of items) {
        if (t.kind === 'move' && t.fromGroupId) {
          const { error: delErr } = await supabase
            .from('backshop_product_group_members')
            .delete()
            .eq('group_id', t.fromGroupId)
            .eq('plu', t.plu)
            .eq('source', t.source)
          if (delErr) throw delErr
        }
        const { error: insErr } = await supabase
          .from('backshop_product_group_members')
          .insert({ group_id: groupId, plu: t.plu, source: t.source } as never)
        if (insErr) throw insErr
      }
    },
    onSuccess: () => {
      toast.success('Mitglieder gespeichert')
      queryClient.invalidateQueries({ queryKey: ['backshop-product-groups'] })
    },
    onError: (err) => toast.error(`Fehler: ${formatError(err)}`),
  })
}
