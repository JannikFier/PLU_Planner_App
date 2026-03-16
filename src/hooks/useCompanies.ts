import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Company } from '@/types/database'

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies' as never)
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as Company[]
    },
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { name: string; logoUrl?: string | null }) => {
      const { data, error } = await supabase
        .from('companies' as never)
        .insert({ name: params.name, logo_url: params.logoUrl ?? null } as never)
        .select()
        .single()
      if (error) throw error
      return data as unknown as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Firma wurde angelegt.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; logoUrl?: string | null; isActive?: boolean }) => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (params.name !== undefined) update.name = params.name
      if (params.logoUrl !== undefined) update.logo_url = params.logoUrl
      if (params.isActive !== undefined) update.is_active = params.isActive
      const { error } = await supabase
        .from('companies' as never)
        .update(update as never)
        .eq('id', params.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Firma wurde aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('companies' as never)
        .delete()
        .eq('id', companyId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Firma wurde gelöscht.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
