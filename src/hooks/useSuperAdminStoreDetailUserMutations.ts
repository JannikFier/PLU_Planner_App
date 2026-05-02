import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invokeEdgeFunction } from '@/lib/supabase'
import { generateOneTimePassword } from '@/lib/profile-helpers'
import { toast } from 'sonner'

export type CreateStoreUserPayload = {
  newEmail: string
  newPersonalnummer: string
  newDisplayName: string
  newRole: 'user' | 'admin' | 'viewer'
}

/**
 * Edge-Mutationen für Benutzer auf der SuperAdminStoreDetailPage (Stufe 4.5).
 */
export function useSuperAdminStoreDetailUserMutations(options: {
  companyId: string | undefined
  /** Aktueller Markt (home_store_id bei Neuanlage) */
  homeStoreId: string | undefined
  isSuperAdmin: boolean
  onCreateSuccess: (oneTimePassword: string) => void
  onResetSuccess: (oneTimePassword: string) => void
  onDeleteUserSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { companyId, homeStoreId, isSuperAdmin, onCreateSuccess, onResetSuccess, onDeleteUserSuccess } = options

  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateStoreUserPayload) => {
      if (!homeStoreId) throw new Error('Kein Markt ausgewählt.')
      const pw = generateOneTimePassword()
      await invokeEdgeFunction('create-user', {
        email: payload.newEmail.trim() || undefined,
        password: pw,
        personalnummer: payload.newPersonalnummer.trim() || undefined,
        displayName: payload.newDisplayName,
        role: isSuperAdmin ? payload.newRole : 'user',
        home_store_id: homeStoreId,
        additional_store_ids: [],
      })
      return { oneTimePassword: pw }
    },
    onSuccess: (result) => {
      onCreateSuccess(result.oneTimePassword)
      void queryClient.invalidateQueries({ queryKey: ['company-profiles', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      toast.success('Benutzer angelegt und diesem Markt zugewiesen!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const pw = generateOneTimePassword()
      await invokeEdgeFunction('reset-password', { userId, newPassword: pw })
      return pw
    },
    onSuccess: (pw) => {
      onResetSuccess(pw)
      toast.success('Passwort wurde zurückgesetzt!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await invokeEdgeFunction('delete-user', { userId })
    },
    onSuccess: () => {
      onDeleteUserSuccess()
      void queryClient.invalidateQueries({ queryKey: ['company-profiles', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['store-access'] })
      toast.success('Benutzer wurde endgültig gelöscht.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole: role }: { userId: string; newRole: string }) => {
      await invokeEdgeFunction('update-user-role', { userId, newRole: role })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['store-user-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['company-profiles', companyId] })
      toast.success('Rolle wurde geändert.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return {
    createUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    updateRoleMutation,
  }
}
