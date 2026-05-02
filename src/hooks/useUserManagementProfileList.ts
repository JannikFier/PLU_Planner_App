import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentStore } from '@/hooks/useCurrentStore'
import { useCompanyProfiles } from '@/hooks/useCompanyProfiles'
import type { Profile } from '@/types/database'

/**
 * Profilliste und Kontext für UserManagement (Stufe 4.8) – ohne Dialog-/Mutations-State.
 */
export function useUserManagementProfileList() {
  const { isSuperAdmin, user: currentUser } = useAuth()
  const { currentStoreId, currentCompanyId, storeName, isLoading: storeContextLoading } = useCurrentStore()
  const currentUserId = currentUser?.id ?? null

  const { data: adminUsers, isLoading: adminUsersLoading, isError: adminUsersError } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Profile[]
    },
    enabled: !isSuperAdmin,
  })

  const {
    data: companyUsers,
    isLoading: companyUsersLoading,
    isError: companyUsersError,
  } = useCompanyProfiles(isSuperAdmin ? currentCompanyId : null)

  const isLoading = isSuperAdmin
    ? storeContextLoading || (!!currentCompanyId && companyUsersLoading)
    : adminUsersLoading

  const isError = isSuperAdmin ? companyUsersError : adminUsersError

  const needsCompanyHint = isSuperAdmin && !storeContextLoading && !currentCompanyId

  const filteredUsers = useMemo(() => {
    const withoutSa = (list: Profile[] | undefined) =>
      list?.filter((u) => u.role !== 'super_admin') ?? []

    if (isSuperAdmin) {
      if (!currentCompanyId) return []
      return [...withoutSa(companyUsers)].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    }
    return withoutSa(adminUsers)
  }, [isSuperAdmin, currentCompanyId, companyUsers, adminUsers])

  const firstUserRowId = useMemo(() => filteredUsers[0]?.id ?? null, [filteredUsers])

  const { data: homeStoreId } = useQuery({
    queryKey: ['home-store-id', currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error('Nicht eingeloggt.')
      const { data, error } = await supabase
        .from('user_store_access' as never)
        .select('store_id')
        .eq('user_id', currentUserId)
        .eq('is_home_store', true)
        .single()

      if (error) throw error
      return (data as { store_id: string } | null)?.store_id ?? null
    },
    enabled: !!currentUserId && !isSuperAdmin,
  })

  const effectiveStoreId = isSuperAdmin ? currentStoreId : currentStoreId ?? homeStoreId
  const defaultStoreId = effectiveStoreId ?? undefined

  return {
    isSuperAdmin,
    currentUserId,
    currentStoreId,
    currentCompanyId,
    storeName,
    storeContextLoading,
    isLoading,
    isError,
    needsCompanyHint,
    filteredUsers,
    firstUserRowId,
    effectiveStoreId,
    defaultStoreId,
  }
}
