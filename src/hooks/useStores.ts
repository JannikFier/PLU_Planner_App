import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Store } from '@/types/database'

export function useStoresByCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['stores', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Keine Firma angegeben.')
      const { data, error } = await supabase
        .from('stores' as never)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as Store[]
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllStores() {
  return useQuery({
    queryKey: ['stores', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores' as never)
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as Store[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useStoreById(storeId: string | undefined) {
  return useQuery({
    queryKey: ['stores', 'detail', storeId],
    queryFn: async () => {
      if (!storeId) throw new Error('Kein Markt angegeben.')
      const { data, error } = await supabase
        .from('stores' as never)
        .select('*')
        .eq('id', storeId)
        .single()
      if (error) throw error
      return data as unknown as Store
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { companyId: string; name: string; subdomain: string; logoUrl?: string | null }) => {
      const { data, error } = await supabase
        .from('stores' as never)
        .insert({
          company_id: params.companyId,
          name: params.name,
          subdomain: params.subdomain,
          logo_url: params.logoUrl ?? null,
        } as never)
        .select()
        .single()
      if (error) throw error

      const storeData = data as unknown as Store
      await supabase
        .from('store_list_visibility' as never)
        .insert([
          { store_id: storeData.id, list_type: 'obst_gemuese', is_visible: true },
          { store_id: storeData.id, list_type: 'backshop', is_visible: true },
        ] as never)

      return storeData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Markt wurde angelegt.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; subdomain?: string; logoUrl?: string | null; isActive?: boolean }) => {
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (params.name !== undefined) update.name = params.name
      if (params.subdomain !== undefined) update.subdomain = params.subdomain
      if (params.logoUrl !== undefined) update.logo_url = params.logoUrl
      if (params.isActive !== undefined) update.is_active = params.isActive
      const { error } = await supabase
        .from('stores' as never)
        .update(update as never)
        .eq('id', params.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      toast.success('Markt wurde aktualisiert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase
        .from('stores' as never)
        .delete()
        .eq('id', storeId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      toast.success('Markt wurde gelöscht.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCheckSubdomain() {
  return useMutation({
    mutationFn: async (subdomain: string) => {
      const { data, error } = await supabase
        .from('stores' as never)
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle()
      if (error) throw error
      return { available: !data }
    },
  })
}
